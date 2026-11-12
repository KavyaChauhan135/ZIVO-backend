import { Router } from "express";
import {
  changePassword,
  getMe,
  login,
  logout,
  logoutAll,
  refresh,
  register,
  updateMe,
} from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import {
  authLimiter,
  refreshLimiter,
} from "../middlewares/rateLimit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  changePasswordRules,
  loginRules,
  registerRules,
  updateProfileRules,
} from "../validators/auth.validator.js";

const router = Router();

// Public
router.post("/register", authLimiter, validate(registerRules), register);
router.post("/login", authLimiter, validate(loginRules), login);
router.post("/refresh", refreshLimiter, refresh);
router.post("/logout", logout);

// Authenticated
router.post("/logout-all", protect, logoutAll);
router.get("/me", protect, getMe);
router.patch("/me", protect, validate(updateProfileRules), updateMe);
router.patch(
  "/change-password",
  protect,
  validate(changePasswordRules),
  changePassword,
);

export default router;
