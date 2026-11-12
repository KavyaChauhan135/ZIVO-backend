import { Router } from "express";
import { listUsers } from "../controllers/user.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";
import { ROLES } from "../models/user.model.js";

const router = Router();

router.use(protect, authorize(ROLES.ADMIN));

router.get("/", listUsers);

export default router;
