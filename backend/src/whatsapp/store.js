import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";

// A durable single-process presentation store, intentionally separate from MongoDB.
export class ConversationStore {
  constructor(directory) {
    this.directory = directory;
    this.queue = Promise.resolve();
    this.state = { version: 1, sessions: {}, inbox: {}, requests: {}, delivery: {} };
  }

  async initialize() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    try {
      this.state = JSON.parse(await readFile(path.join(this.directory, "state.json"), "utf8"));
      if (this.state.version !== 1 || !this.state.sessions || !this.state.inbox || !this.state.requests) throw new Error("Invalid conversation store");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    // Never blindly repeat an external send after an uncertain interruption.
    await this.mutate((state) => {
      state.delivery ||= {};
      for (const job of Object.values(state.inbox)) {
        if (job.status === "processing" || job.status === "sending") job.status = "needs_review";
      }
    });
    return this;
  }

  snapshot() { return structuredClone(this.state); }

  mutate(callback) {
    const operation = this.queue.then(async () => {
      const next = structuredClone(this.state);
      const result = callback(next);
      if (result?.then) throw new Error("Store mutations must be synchronous");
      const filename = path.join(this.directory, "state.json");
      await writeFile(`${filename}.tmp`, JSON.stringify(next, null, 2), { mode: 0o600 });
      await rename(`${filename}.tmp`, filename);
      this.state = next;
      return structuredClone(result);
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
}
