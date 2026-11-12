import config from "../config/config.js";

export const REFRESH_COOKIE_NAME = "refreshToken";

const baseOptions = () => ({
  httpOnly: true,
  secure: config.isProduction || config.COOKIE_SAME_SITE === "none",
  sameSite: config.COOKIE_SAME_SITE,
  path: "/api/auth",
});

export const setRefreshCookie = (res, token, expiresAt) =>
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...baseOptions(),
    expires: expiresAt,
  });

export const clearRefreshCookie = (res) =>
  res.clearCookie(REFRESH_COOKIE_NAME, baseOptions());
