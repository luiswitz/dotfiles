/**
 * run-budget extension
 *
 * Keeps agent sessions inside a predictable turn and context budget, and
 * hands work off to a fresh session before the budget is exhausted.
 *
 * Budgets apply per session. The turn counter accumulates across runs and is
 * never reset within a session; it is persisted to the session file (one
 * "run-budget-turn" entry per turn) and rebuilt on `session_start`, so
 * reload, resume, and fork all keep the true count. A brand-new pi session
 * has no recorded turns and starts from zero. The status also carries a
 * lineage count of completed automatic handoffs; manual continuation keeps
 * that count unchanged.
 *
 * Invariant: a low counter implies a fresh session. A session with a large
 * context always carries a matching high turn count.
 *
 *   - context:  warn at 80k tokens, early compaction at 100k tokens
 *   - turns:    runaway guard only — warn at 80, request a handoff at 90,
 *               abort past 100
 *
 * Context size drives cost and drift, so in-place compaction is the normal
 * path; the turn handoff only catches runaway sessions.
 *
 * Once the turn budget is exhausted the session is done: any further prompt
 * aborts on its first turn, and the work continues in a replacement session
 * via the handoff flow below.
 *
 * Handoff flow: at turn 90 the model is steered into writing a Markdown
 * handoff file instead of starting new work. When the run settles, the
 * extension verifies the handoff and dispatches `/run-budget-continue <file>`,
 * which spawns a replacement session (current session recorded as parent),
 * restores the selected model and thinking level there, and kicks off the
 * replacement agent with the handoff as its first user message. Each
 * successfully dispatched automatic replacement increments the lineage's
 * handoff count once.
 *
 * Everything is provider/model agnostic; budgets are the named constants
 * directly below.
 */

import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
  SessionStartEvent,
} from "@earendil-works/pi-coding-agent";
import { readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

// ---------------------------------------------------------------------------
// Budget configuration — adjust these constants to retune the budgets.
// ---------------------------------------------------------------------------

/** Maximum model turns per session. A run that starts a turn beyond this is aborted. */
const MAX_TURNS = 100;
/** Show a warning when this many turns have started. */
const WARN_AT_TURNS = 80;
/** At this turn, request a handoff instead of starting new implementation work. */
const HANDOFF_TURN = 90;
/** Context-token usage at which a warning is shown. */
const CONTEXT_WARNING_TOKENS = 80_000;
/** Context-token usage at which early compaction is triggered. */
const CONTEXT_COMPACTION_TOKENS = 100_000;
/** How long continuation state stays valid for a replacement session. */
const CONTINUATION_STATE_TTL_MS = 10 * 60 * 1000;

const STATUS_KEY = "run-budget";
const CONTINUE_COMMAND = "run-budget-continue";
const CONTINUATION_STATE_PREFIX = "pi-run-budget-continuation-";
/** Custom session-entry type recording one turn each, for count rebuilds. */
const TURN_ENTRY_TYPE = "run-budget-turn";
/** Custom session-entry type preserving the automatic-handoff lineage count. */
const HANDOFF_COUNT_ENTRY_TYPE = "run-budget-handoff-count";

/** Instructions handed to the compactor so early compaction keeps handoff-critical context. */
const COMPACTION_INSTRUCTIONS = [
  "Preserve with high fidelity: the overall goal; constraints and decisions",
  "made so far (with rationale); the list of modified files and their current",
  "state; validation performed and its outcome; unresolved issues and",
  "blockers; and the exact next step to continue the work.",
].join(" ");

const THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"] as const;
type ThinkingLevel = (typeof THINKING_LEVELS)[number];

/** State passed from a session that requested a continuation to its replacement session. */
interface ContinuationState {
  version: 1;
  createdAt: number;
  parentSessionFile: string | undefined;
  handoffFile: string;
  model: { provider: string; id: string } | undefined;
  thinkingLevel: string | undefined;
  /** Completed automatic handoffs in this replacement-session lineage. */
  completedAutomaticHandoffs?: number;
}

interface RunState {
  /** Turns started in the current session (never reset within a session). */
  turns: number;
  /** Completed automatic handoffs in this replacement-session lineage. */
  completedAutomaticHandoffs: number;
  /** Deferred handoff-continuation dispatch handle. */
  continuationTimer: ReturnType<typeof setTimeout> | undefined;
  /** Handoff path whose queued command was initiated automatically on settle. */
  automaticContinuationPath: string | undefined;
  turnWarned: boolean;
  contextWarned: boolean;
  compactionRequested: boolean;
  aborted: boolean;
  handoffRequested: boolean;
  handoffPath: string | undefined;
}

type HandoffRead = { ok: true; content: string } | { ok: false; reason: string };

export default function (pi: ExtensionAPI) {
  // All state lives in this closure. A session replacement reloads extensions,
  // so the replacement session gets a fresh closure and cannot inherit stale
  // run state; anything that must cross the boundary goes through the
  // continuation-state file.
  let generation = 0;
  let run = freshRun();
  let continuationInFlight = false;

  function freshRun(): RunState {
    return {
      turns: 0,
      completedAutomaticHandoffs: 0,
      continuationTimer: undefined,
      automaticContinuationPath: undefined,
      turnWarned: false,
      contextWarned: false,
      compactionRequested: false,
      aborted: false,
      handoffRequested: false,
      handoffPath: undefined,
    };
  }

  function clearRunTimers(): void {
    if (run.continuationTimer) clearTimeout(run.continuationTimer);
    run.continuationTimer = undefined;
  }

  /** Reset all session state and invalidate every pending timer callback. */
  function resetRun(): void {
    clearRunTimers();
    run = freshRun();
    generation += 1;
  }

  // -------------------------------------------------------------------------
  // Small helpers
  // -------------------------------------------------------------------------

  function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /** Notify only when a dialog-capable UI exists; never throw on a stale context. */
  function notify(ctx: ExtensionContext, message: string, type: "info" | "warning" | "error"): void {
    try {
      if (ctx.hasUI) ctx.ui.notify(message, type);
    } catch {
      // Stale context after session replacement — nothing sensible to do.
    }
  }

  function setStatus(ctx: ExtensionContext, text: string): void {
    try {
      if (ctx.hasUI) ctx.ui.setStatus(STATUS_KEY, text);
    } catch {
      // Stale context after session replacement.
    }
  }

  function formatTokens(tokens: number): string {
    if (tokens < 1000) return `${tokens}`;
    return `${(tokens / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }

  function runningStatus(ctx: ExtensionContext): string {
    let text = `budget ${run.turns}/${MAX_TURNS} · handoffs ${run.completedAutomaticHandoffs}`;
    try {
      const tokens = ctx.getContextUsage()?.tokens;
      if (tokens != null) text += ` · ctx ${formatTokens(tokens)}`;
    } catch {
      // Context usage unavailable — status works fine without it.
    }
    return text;
  }

  function sanitizeId(id: string): string {
    return id.replace(/[^A-Za-z0-9._-]/g, "-");
  }

  function continuationStatePath(sessionId: string): string {
    return join(tmpdir(), `${CONTINUATION_STATE_PREFIX}${sanitizeId(sessionId)}.json`);
  }

  /** Session files are named `<timestamp>_<session-id>.jsonl`. */
  function sessionIdFromFile(sessionFile: string): string | undefined {
    const name = basename(sessionFile).replace(/\.jsonl$/, "");
    const separator = name.indexOf("_");
    if (separator < 0 || separator === name.length - 1) return undefined;
    return name.slice(separator + 1);
  }

  async function removeQuietly(path: string): Promise<void> {
    try {
      await unlink(path);
    } catch {
      // Already gone — fine.
    }
  }

  async function readHandoff(path: string): Promise<HandoffRead> {
    let raw: string;
    try {
      raw = await readFile(path, "utf8");
    } catch (error) {
      return { ok: false, reason: `cannot read handoff file ${path}: ${errorMessage(error)}` };
    }
    if (!raw.trim()) {
      return { ok: false, reason: `handoff file is empty: ${path}` };
    }
    return { ok: true, content: raw };
  }

  /**
   * Rebuild the session-scoped turn count from the session file. The count is
   * a property of the session, not of this extension instance, so reload,
   * resume, and fork all keep it. Anything unreadable counts as zero.
   */
  function countRecordedTurns(ctx: ExtensionContext): number {
    try {
      return ctx.sessionManager
        .getBranch()
        .filter((entry) => entry.type === "custom" && entry.customType === TURN_ENTRY_TYPE)
        .length;
    } catch {
      return 0;
    }
  }

  /** Restore the latest lineage total persisted in this session's active branch. */
  function countCompletedAutomaticHandoffs(ctx: ExtensionContext): number {
    try {
      const branch = ctx.sessionManager.getBranch();
      for (let index = branch.length - 1; index >= 0; index -= 1) {
        const entry = branch[index];
        if (entry.type !== "custom" || entry.customType !== HANDOFF_COUNT_ENTRY_TYPE) continue;
        const count = (entry.data as { count?: unknown } | undefined)?.count;
        if (typeof count === "number" && Number.isSafeInteger(count) && count >= 0) return count;
      }
    } catch {
      // Unreadable session state counts as no completed handoffs.
    }
    return 0;
  }

  // -------------------------------------------------------------------------
  // Budget enforcement
  // -------------------------------------------------------------------------

  /**
   * Stop the current run exactly once. Idempotent within a run; the latch is
   * re-armed on `before_agent_start` (the turn counter itself is session-scoped
   * and never resets, so an over-budget session keeps aborting new runs).
   */
  function abortRun(ctx: ExtensionContext, reason: string): void {
    if (run.aborted) return;
    run.aborted = true;
    try {
      ctx.abort();
    } catch {
      // Agent already gone — the notification below still applies.
    }
    notify(ctx, `${reason} Agent stopped.`, "error");
  }

  function requestEarlyCompaction(ctx: ExtensionContext): void {
    const gen = generation;
    notify(
      ctx,
      `run-budget: context usage exceeded ${formatTokens(CONTEXT_COMPACTION_TOKENS)} tokens — compacting early.`,
      "info",
    );
    ctx.compact({
      customInstructions: COMPACTION_INSTRUCTIONS,
      onComplete: () => {
        if (gen !== generation) return;
        notify(ctx, "run-budget: early compaction completed.", "info");
      },
      onError: (error) => {
        if (gen !== generation) return;
        notify(ctx, `run-budget: early compaction failed: ${error.message}`, "error");
      },
    });
  }

  // -------------------------------------------------------------------------
  // Handoff
  // -------------------------------------------------------------------------

  function buildHandoffPrompt(path: string): string {
    return [
      `[run-budget] This session is limited to ${MAX_TURNS} turns and turn ${HANDOFF_TURN} is the last`,
      "implementation turn. Stop starting new implementation work now and write a handoff for a",
      "fresh session.",
      "",
      `Use the write tool to create this exact file: ${path}`,
      "",
      "The file must be concise Markdown with exactly these sections, in this order:",
      "## Goal",
      "## Completed",
      "## Files Changed",
      "## Validation",
      "## Remaining Work",
      "## Blockers",
      "## Exact Next Step",
      "",
      "Cover: the goal and key constraints; decisions made and why; files created or modified",
      "(with paths); how the work was validated and the results; unresolved issues and blockers;",
      "and the single exact next step.",
      "",
      "If a vsbl context is bound, first rewrite its work file's current-state sections (Goal,",
      "Done when, Decisions, Constraints, Open issues, Next step) and log a vsbl next_step event.",
      "",
      "After writing the file, reply with one short confirmation sentence and STOP — make no",
      "further tool calls. A replacement session will continue from your handoff.",
    ].join("\n");
  }

  /** Ask the model (once per run) to write the handoff instead of doing new work. */
  function requestHandoff(ctx: ExtensionContext): void {
    run.handoffRequested = true;
    const sessionId = sanitizeId(ctx.sessionManager.getSessionId());
    const path = join(tmpdir(), `pi-handoff-${sessionId}-${Date.now()}.md`);
    run.handoffPath = path;
    try {
      // "steer" delivers after this turn's tool calls, before the next LLM call.
      pi.sendUserMessage(buildHandoffPrompt(path), { deliverAs: "steer" });
      notify(ctx, `run-budget: ${run.turns}/${MAX_TURNS} turns used — requested handoff at ${path}.`, "info");
    } catch (error) {
      run.handoffRequested = false;
      run.handoffPath = undefined;
      notify(ctx, `run-budget: failed to request handoff: ${errorMessage(error)}`, "error");
    }
  }

  function buildKickoffMessage(handoffContent: string, handoffFile: string): string {
    return [
      "This session continues work from a previous session that exhausted its turn budget.",
      `The handoff written at the end of that run follows below (also saved at ${handoffFile}).`,
      "",
      "<handoff>",
      handoffContent.trim(),
      "</handoff>",
      "",
      "Before making changes, run git status to confirm the listed changes exist; read files only",
      "when the next step needs them. Then continue from the \"Exact Next Step\". Do not repeat",
      "work listed under \"Completed\".",
    ].join("\n");
  }

  /**
   * Shared continuation logic behind `/run-budget-continue`. Also reached
   * automatically when a handoff run settles with a valid handoff file.
   */
  async function continueFromHandoff(
    args: string,
    ctx: ExtensionCommandContext,
    automatic: boolean,
  ): Promise<void> {
    const handoffFile = args.trim();
    if (!handoffFile) {
      notify(ctx, `Usage: /${CONTINUE_COMMAND} <handoff-file>`, "error");
      return;
    }
    const handoff = await readHandoff(handoffFile);
    if (!handoff.ok) {
      notify(
        ctx,
        `run-budget: ${handoff.reason}. Fix the file, then re-run /${CONTINUE_COMMAND} ${handoffFile}.`,
        "error",
      );
      return;
    }
    if (continuationInFlight) {
      notify(ctx, "run-budget: a continuation is already in progress.", "warning");
      return;
    }
    continuationInFlight = true;
    try {
      // Never tear a session over mid-run; wait until the agent is fully idle.
      await ctx.waitForIdle();

      const model = ctx.model;
      const parentSession = ctx.sessionManager.getSessionFile();
      const statePath = continuationStatePath(ctx.sessionManager.getSessionId());
      const state: ContinuationState = {
        version: 1,
        createdAt: Date.now(),
        parentSessionFile: parentSession,
        handoffFile,
        model: model ? { provider: model.provider, id: model.id } : undefined,
        thinkingLevel: ctx.thinkingLevel,
        completedAutomaticHandoffs:
          run.completedAutomaticHandoffs + (automatic ? 1 : 0),
      };
      // The replacement session is a fresh extension instance; this file is how
      // the selected model and thinking level cross the boundary.
      await writeFile(statePath, JSON.stringify(state, null, 2), "utf8");

      const kickoff = buildKickoffMessage(handoff.content, handoffFile);
      const result = await ctx.newSession({
        parentSession,
        withSession: async (replacementCtx) => {
          // Only replacement-session ctx may be used here; the old ctx is stale.
          await replacementCtx.sendUserMessage(kickoff);
          notify(replacementCtx, "run-budget: continued from handoff.", "info");
        },
      });

      if (result.cancelled) {
        await removeQuietly(statePath);
        notify(
          ctx,
          `run-budget: continuation cancelled — your session is unchanged. Re-run /${CONTINUE_COMMAND} ${handoffFile} to retry.`,
          "warning",
        );
      }
      // On success this context is stale; the replacement session takes over.
    } catch (error) {
      notify(ctx, `run-budget: continuation failed: ${errorMessage(error)}`, "error");
    } finally {
      continuationInFlight = false;
    }
  }

  // -------------------------------------------------------------------------
  // Continuation-state restore (runs in the replacement session)
  // -------------------------------------------------------------------------

  async function loadContinuationState(
    event: SessionStartEvent,
  ): Promise<{ path: string; state: ContinuationState } | undefined> {
    const candidates: string[] = [];
    const previousId = event.previousSessionFile ? sessionIdFromFile(event.previousSessionFile) : undefined;
    if (previousId) {
      candidates.push(continuationStatePath(previousId));
    } else {
      // Fallback for non-persisted parent sessions: any fresh state file.
      try {
        const files = await readdir(tmpdir());
        for (const file of files) {
          if (file.startsWith(CONTINUATION_STATE_PREFIX) && file.endsWith(".json")) {
            candidates.push(join(tmpdir(), file));
          }
        }
      } catch {
        return undefined;
      }
    }

    for (const path of candidates) {
      let state: ContinuationState | undefined;
      try {
        state = JSON.parse(await readFile(path, "utf8")) as ContinuationState;
      } catch {
        continue; // Not ours or unreadable.
      }
      if (state?.version !== 1 || typeof state.createdAt !== "number") {
        continue;
      }
      if (Date.now() - state.createdAt > CONTINUATION_STATE_TTL_MS) {
        await removeQuietly(path); // Expired — clean up opportunistically.
        continue;
      }
      return { path, state };
    }
    return undefined;
  }

  /** Restore model and thinking level recorded by the previous session. */
  async function applyPendingContinuation(event: SessionStartEvent, ctx: ExtensionContext): Promise<void> {
    if (event.reason !== "new") return;
    const found = await loadContinuationState(event);
    if (!found) return;
    const { path, state } = found;
    await removeQuietly(path); // Consume exactly once.

    const completedAutomaticHandoffs = state.completedAutomaticHandoffs;
    if (
      typeof completedAutomaticHandoffs === "number" &&
      Number.isSafeInteger(completedAutomaticHandoffs) &&
      completedAutomaticHandoffs >= 0
    ) {
      run.completedAutomaticHandoffs = completedAutomaticHandoffs;
      pi.appendEntry(HANDOFF_COUNT_ENTRY_TYPE, { count: completedAutomaticHandoffs });
    }

    if (state.model) {
      const label = `${state.model.provider}/${state.model.id}`;
      try {
        const model = ctx.modelRegistry.find(state.model.provider, state.model.id);
        if (!model) {
          notify(ctx, `run-budget: model ${label} is unavailable — using the default model.`, "warning");
        } else {
          const applied = await pi.setModel(model);
          if (!applied) {
            notify(ctx, `run-budget: no credentials for ${label} — using the default model.`, "warning");
          }
        }
      } catch (error) {
        notify(ctx, `run-budget: failed to restore model ${label}: ${errorMessage(error)}`, "warning");
      }
    }

    if (state.thinkingLevel && (THINKING_LEVELS as readonly string[]).includes(state.thinkingLevel)) {
      try {
        pi.setThinkingLevel(state.thinkingLevel as ThinkingLevel);
      } catch {
        // Model may not support the recorded level; pi clamps it anyway.
      }
    }
  }

  // -------------------------------------------------------------------------
  // Event wiring
  // -------------------------------------------------------------------------

  pi.on("session_start", async (event, ctx) => {
    resetRun();
    // The turn count is a property of the session, not of this extension
    // instance: rebuild it from the session file so reload, resume, and fork
    // keep the true count instead of restarting at zero.
    run.turns = countRecordedTurns(ctx);
    run.completedAutomaticHandoffs = countCompletedAutomaticHandoffs(ctx);
    await applyPendingContinuation(event, ctx);
    setStatus(ctx, runningStatus(ctx));
  });

  pi.on("before_agent_start", async (_event, ctx) => {
    // Budgets are session-scoped: never reset the turn counter here. The abort
    // latch is re-armed so an over-budget session aborts each new run again.
    run.aborted = false;
    setStatus(ctx, runningStatus(ctx));
  });

  pi.on("turn_start", async (_event, ctx) => {
    run.turns += 1;
    // Persist every turn so the count survives reload/resume/fork — the
    // counter is rebuilt from these entries on session_start.
    pi.appendEntry(TURN_ENTRY_TYPE, { turn: run.turns });
    setStatus(ctx, runningStatus(ctx));

    if (run.turns >= WARN_AT_TURNS && !run.turnWarned) {
      run.turnWarned = true;
      notify(ctx, `run-budget: ${run.turns} of ${MAX_TURNS} turns used — start wrapping up.`, "warning");
    }

    if (run.turns > MAX_TURNS) {
      abortRun(
        ctx,
        `run-budget: session turn budget exhausted (${MAX_TURNS} turns). ` +
          (run.handoffPath
            ? `A fresh session will pick up from the handoff (or run /${CONTINUE_COMMAND} ${run.handoffPath} yourself).`
            : `Write a handoff, then run /${CONTINUE_COMMAND} <handoff-file>, or start a new session.`),
      );
    }
  });

  pi.on("turn_end", async (_event, ctx) => {
    setStatus(ctx, runningStatus(ctx));

    let tokens: number | null | undefined;
    try {
      tokens = ctx.getContextUsage()?.tokens;
    } catch {
      tokens = undefined;
    }
    if (tokens != null) {
      if (tokens > CONTEXT_COMPACTION_TOKENS && !run.compactionRequested) {
        // Latched for the rest of the run — no duplicate compactions.
        run.compactionRequested = true;
        requestEarlyCompaction(ctx);
      } else if (tokens > CONTEXT_WARNING_TOKENS && !run.contextWarned) {
        run.contextWarned = true;
        notify(
          ctx,
          `run-budget: context usage ${formatTokens(tokens)} tokens exceeded ${formatTokens(CONTEXT_WARNING_TOKENS)}.`,
          "warning",
        );
      }
    }

    // Steer now so the handoff request is delivered before turn HANDOFF_TURN.
    // `>=` also covers sessions restored past the threshold (reload/resume),
    // where exact equality would never fire.
    if (!run.aborted && !run.handoffRequested && run.turns >= HANDOFF_TURN - 1) {
      requestHandoff(ctx);
    }
  });

  pi.on("agent_settled", async (_event, ctx) => {
    setStatus(ctx, runningStatus(ctx));

    if (!run.handoffRequested || !run.handoffPath) return;
    const handoffPath = run.handoffPath;

    const handoff = await readHandoff(handoffPath);
    if (!handoff.ok) {
      notify(
        ctx,
        `run-budget: ${handoff.reason}. Write the handoff there, then run /${CONTINUE_COMMAND} ${handoffPath} to continue in a fresh session.`,
        "error",
      );
      return;
    }

    // Dispatch the continuation command. Deferred out of the event-handler
    // stack: the command replaces the session, which must not happen
    // re-entrantly while pi is still emitting agent_settled.
    const gen = generation;
    run.continuationTimer = setTimeout(() => {
      run.continuationTimer = undefined;
      if (gen !== generation) return; // A newer run or shutdown superseded this.
      try {
        if (!ctx.isIdle()) return;
        run.automaticContinuationPath = handoffPath;
        pi.sendUserMessage(`/${CONTINUE_COMMAND} ${handoffPath}`, { expandPromptTemplates: true });
      } catch {
        run.automaticContinuationPath = undefined;
        // Session replaced or shutting down — nothing to continue from.
      }
    }, 0);
    run.continuationTimer.unref?.();
  });

  pi.on("session_shutdown", async () => {
    clearRunTimers();
    generation += 1; // Invalidate any callback still holding this closure.
  });

  pi.registerCommand(CONTINUE_COMMAND, {
    description: "Continue work from a run-budget handoff file in a fresh session",
    handler: async (args, ctx) => {
      const handoffFile = args.trim();
      const automatic = run.automaticContinuationPath === handoffFile;
      run.automaticContinuationPath = undefined;
      await continueFromHandoff(args, ctx, automatic);
    },
  });
}
