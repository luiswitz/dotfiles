import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const buildContinuationPrompt = (sessionFile: string | undefined, compactionEntryId: string): string => {
	const sessionSource =
		sessionFile === undefined
			? "This session is ephemeral, so no persisted session file is available."
			: [
					`Fallback only: the persisted session JSONL is ${JSON.stringify(sessionFile)}`,
					`(compaction entry ${JSON.stringify(compactionEntryId)}).`,
					"Read a targeted slice of it with the read and bash tools only if a specific fact the next step needs is missing above.",
					"Never read it whole, and do not launch a nested Pi process or open it with `pi --session`.",
				].join(" ");

	return `Compaction has just completed. Resume the existing task rather than waiting for another user prompt.

Before continuing:

1. Recover the goal, constraints, decisions, and next step from the compaction summary and, when present, the vsbl context anchor (work-file goal, done when, constraints, next step). These are authoritative for intent.
2. Treat the current worktree as authoritative for file state: check git status, and read files only when the next step needs them.
3. Briefly state the context you recovered in a few lines.
4. Immediately perform the next unfinished step. Do not stop after the recap and do not ask the user to repeat prior context unless it is genuinely unavailable or ambiguous.

${sessionSource}`;
};

/**
 * Automatically resumes work after every successful Pi compaction.
 *
 * The continuation is deferred by one event-loop turn so manual compaction can
 * finish reconnecting the agent runtime before a new prompt begins. During an
 * active automatic-compaction recovery, it is delivered as a follow-up.
 */
export default function continueAfterCompaction(pi: ExtensionAPI): void {
	const pendingTimers = new Set<ReturnType<typeof setTimeout>>();

	pi.on("session_compact", (event, ctx) => {
		const sessionFile = ctx.sessionManager.getSessionFile();
		const prompt = buildContinuationPrompt(sessionFile, event.compactionEntry.id);

		const timer = setTimeout(() => {
			pendingTimers.delete(timer);
			pi.sendUserMessage(prompt, { deliverAs: "followUp" });
		}, 0);

		pendingTimers.add(timer);
	});

	pi.on("session_shutdown", () => {
		for (const timer of pendingTimers) {
			clearTimeout(timer);
		}
		pendingTimers.clear();
	});
}
