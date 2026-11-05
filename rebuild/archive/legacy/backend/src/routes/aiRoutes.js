import { Router } from "express";
import { classifyIssue, triageIssue } from "../controllers/aiController.js";

const router = Router();
router.post("/classify", classifyIssue);
router.post("/triage", triageIssue);

export default router;
