import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { matchedData } from "express-validator";
import config from "../config/config.js";
import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import {
  REFRESH_COOKIE_NAME,
  clearRefreshCookie,
  setRefreshCookie,
} from "../utils/cookies.js";

// Compared against when the email doesn't exist, so login timing doesn't reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", 12);

/**
 * Creates an access token + refresh token, stores the hashed refresh token
 * (keeping at most MAX_SESSIONS per user) and sets it as an httpOnly cookie.
 */
const issueTokens = async (user, req, res) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const expiresAt = new Date(jwt.decode(refreshToken).exp * 1000);

  await User.updateOne(
    { _id: user._id },
    {
      $push: {
        refreshTokens: {
          $each: [
            {
              tokenHash: hashToken(refreshToken),
              expiresAt,
              userAgent: req.get("user-agent")?.slice(0, 200),
              ip: req.ip,
            },
          ],
          $slice: -config.MAX_SESSIONS,
        },
      },
    },
  );

  setRefreshCookie(res, refreshToken, expiresAt);
  return accessToken;
};

const pruneExpiredSessions = (userId) =>
  User.updateOne(
    { _id: userId },
    { $pull: { refreshTokens: { expiresAt: { $lt: new Date() } } } },
  );

const revokeAllSessions = (userId) =>
  User.updateOne({ _id: userId }, { $set: { refreshTokens: [] } });

const sendAuthResponse = (res, statusCode, message, user, accessToken) =>
  res
    .status(statusCode)
    .json({ success: true, message, data: { user, accessToken } });

/** POST /api/auth/register */
export const register = async (req, res) => {
  const { name, email, password } = matchedData(req);

  if (await User.exists({ email })) {
    throw new ApiError(409, "An account with this email already exists");
  }

  // Only whitelisted fields: `role` can never be set from the request body.
  const user = await User.create({ name, email, password });
  const accessToken = await issueTokens(user, req, res);

  sendAuthResponse(res, 201, "Registration successful", user, accessToken);
};

/** POST /api/auth/login */
export const login = async (req, res) => {
  const { email, password } = matchedData(req);

  const user = await User.findOne({ email }).select("+password");
  const passwordOk = await (user
    ? user.comparePassword(password)
    : bcrypt.compare(password, DUMMY_HASH));

  if (!user || !passwordOk) {
    throw new ApiError(401, "Invalid email or password");
  }
  if (!user.isActive) {
    throw new ApiError(403, "Your account has been deactivated");
  }

  await pruneExpiredSessions(user._id);
  const accessToken = await issueTokens(user, req, res);

  sendAuthResponse(res, 200, "Login successful", user, accessToken);
};

/**
 * POST /api/auth/refresh
 * Rotates the refresh token: the presented one is consumed and a new pair is issued.
 * If a correctly signed but already-used token is presented (likely stolen), every
 * session for that user is revoked.
 */
export const refresh = async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) throw new ApiError(401, "Refresh token missing");

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    clearRefreshCookie(res);
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const tokenHash = hashToken(token);

  // Atomically consume the token so it can only ever be used once.
  const user = await User.findOneAndUpdate(
    { _id: payload.sub, "refreshTokens.tokenHash": tokenHash },
    { $pull: { refreshTokens: { tokenHash } } },
  );

  if (!user) {
    await revokeAllSessions(payload.sub);
    clearRefreshCookie(res);
    throw new ApiError(
      401,
      "Refresh token is no longer valid. Please log in again",
    );
  }

  if (!user.isActive || user.changedPasswordAfter(payload.iat)) {
    clearRefreshCookie(res);
    throw new ApiError(401, "Session is no longer valid. Please log in again");
  }

  const accessToken = await issueTokens(user, req, res);
  res.json({
    success: true,
    message: "Token refreshed",
    data: { accessToken },
  });
};

/** POST /api/auth/logout: ends the current session. */
export const logout = async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (token) {
    const tokenHash = hashToken(token);
    await User.updateOne(
      { "refreshTokens.tokenHash": tokenHash },
      { $pull: { refreshTokens: { tokenHash } } },
    );
  }
  clearRefreshCookie(res);
  res.json({ success: true, message: "Logged out successfully" });
};

/** POST /api/auth/logout-all: ends every session for the current user. */
export const logoutAll = async (req, res) => {
  await revokeAllSessions(req.user._id);
  clearRefreshCookie(res);
  res.json({ success: true, message: "Logged out from all devices" });
};

/** GET /api/auth/me */
export const getMe = (req, res) => {
  res.json({ success: true, data: { user: req.user } });
};

/** PATCH /api/auth/me */
export const updateMe = async (req, res) => {
  const updates = matchedData(req, { locations: ["body"] });

  if (updates.email && updates.email !== req.user.email) {
    if (
      await User.exists({ email: updates.email, _id: { $ne: req.user._id } })
    ) {
      throw new ApiError(409, "An account with this email already exists");
    }
  }

  if (updates.name !== undefined) req.user.name = updates.name;
  if (updates.email !== undefined) req.user.email = updates.email;
  await req.user.save();

  res.json({
    success: true,
    message: "Profile updated",
    data: { user: req.user },
  });
};

/** PATCH /api/auth/change-password: revokes all sessions, then starts a new one. */
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = matchedData(req);

  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(401, "Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  await revokeAllSessions(user._id);
  const accessToken = await issueTokens(user, req, res);

  sendAuthResponse(
    res,
    200,
    "Password changed successfully",
    user,
    accessToken,
  );
};
