import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import { seedAdvocatesIfEmpty } from "./config/seed.js";
import aiRoutes from "./routes/aiRoutes.js";
import advocateRoutes from "./routes/advocateRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import emergencyRoutes from "./routes/emergencyRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import { notFound, errorHandler } from "./middlewares/errorMiddleware.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/ai", aiRoutes);
app.use("/api/advocates", advocateRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/emergency", emergencyRoutes);
app.use("/api/payments", paymentRoutes);

app.use(notFound);
app.use(errorHandler);

connectDB()
  .then(async () => {
    await seedAdvocatesIfEmpty();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  });
