import dotenv from "dotenv";
import mongoose from "mongoose";
import Advocate from "../src/models/Advocate.js";

dotenv.config();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const retries = Number(process.env.DB_RETRIES || 5);
  const baseDelayMs = Number(process.env.DB_RETRY_DELAY_MS || 2000);

  let lastErr = null;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      lastErr = null;
      break;
    } catch (err) {
      lastErr = err;
      if (attempt === retries - 1) {
        throw err;
      }
      await sleep(baseDelayMs * (attempt + 1));
    }
  }

  const countBefore = await Advocate.countDocuments();
  const res = await Advocate.deleteMany({});
  const countAfter = await Advocate.countDocuments();

  console.log(
    `Cleared advocates collection. Before=${countBefore}, Deleted=${res.deletedCount}, After=${countAfter}`
  );
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to clear advocates:", err.message);
  process.exit(1);
});

