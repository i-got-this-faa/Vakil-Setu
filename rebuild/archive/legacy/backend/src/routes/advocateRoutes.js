import { Router } from "express";
import { matchAdvocates } from "../controllers/advocateController.js";

const router = Router();
router.post("/match", matchAdvocates);

export default router;
