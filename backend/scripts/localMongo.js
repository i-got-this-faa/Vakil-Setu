// Runs a persistent local MongoDB for development without a system install.
// Data lives in backend/data/mongo; set MONGO_URI=mongodb://127.0.0.1:27017/vakil-setu.
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { MongoMemoryServer } from "mongodb-memory-server";

const dbPath = fileURLToPath(new URL("../data/mongo", import.meta.url));
const port = Number(process.env.LOCAL_MONGO_PORT || 27017);
await mkdir(dbPath, { recursive: true });

const server = await MongoMemoryServer.create({
  instance: { port, ip: "127.0.0.1", dbPath, storageEngine: "wiredTiger" }
});
console.log(`Local MongoDB ready: mongodb://127.0.0.1:${port}/vakil-setu (data: ${dbPath})`);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await server.stop({ doCleanup: false });
    process.exit(0);
  });
}
