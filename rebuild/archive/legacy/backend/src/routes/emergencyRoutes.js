import { Router } from "express";
import { triggerEmergency } from "../controllers/emergencyController.js";

const router = Router();
router.post("/", triggerEmergency);

export default router;
