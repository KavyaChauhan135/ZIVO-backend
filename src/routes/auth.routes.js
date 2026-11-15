import { Router } from "express";
import {
  changePassword,
  getMe,
  googleAuth,
  googleCallback,
  login,
  logout,
  logoutAll,
  refresh,
  register,
  updateMe,
} from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { requireGoogleOAuth } from "../config/passport.js";
import {
  authLimiter,
  oauthLimiter,
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

// Google OAuth (browser navigations, not XHR)
router.get("/google", oauthLimiter, requireGoogleOAuth, googleAuth);
router.get("/google/callback", oauthLimiter, requireGoogleOAuth, googleCallback);

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
