import { Router } from "express";
import { classifyIssue } from "../controllers/aiController.js";

const router = Router();
router.post("/classify", classifyIssue);

export default router;
