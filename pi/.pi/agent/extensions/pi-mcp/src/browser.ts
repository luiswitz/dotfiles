import { spawn } from "node:child_process";

/** Cross-platform "open URL in browser" without a dependency (opencode uses `open`). */
export async function openInBrowser(url: string): Promise<void> {
  const { command, args } = platformCommand(url);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore", detached: true });
    const timer = setTimeout(() => {
      child.unref();
      resolve(); // browser launch is fire-and-forget; don't hang on slow systems
    }, 500);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      if (code === null || code === 0) resolve();
      else reject(new Error(`Browser open failed with exit code ${code}`));
    });
  });
}

function platformCommand(url: string): { command: string; args: string[] } {
  switch (process.platform) {
    case "darwin":
      return { command: "open", args: [url] };
    case "win32":
      return { command: "cmd", args: ["/c", "start", "", url] };
    default:
      return { command: "xdg-open", args: [url] };
  }
}
