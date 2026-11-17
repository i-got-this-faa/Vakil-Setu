import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Keep the college DGX models loaded so replies don't wait for a model reload (see dgxWarm.ts).
crons.interval("keep DGX models loaded", { minutes: 4 }, internal.dgxWarm.ping, {});

export default crons;
