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

// OAuth `state` (CSRF protection). Must be SameSite=Lax: the callback is a
// cross-site redirect from Google, so a Strict cookie would not be sent.
export const OAUTH_STATE_COOKIE_NAME = "oauthState";

const oauthStateOptions = () => ({
  httpOnly: true,
  secure: config.isProduction,
  sameSite: "lax",
  path: "/api/auth/google",
});

export const setOAuthStateCookie = (res, state) =>
  res.cookie(OAUTH_STATE_COOKIE_NAME, state, {
    ...oauthStateOptions(),
    maxAge: 10 * 60 * 1000,
  });

export const clearOAuthStateCookie = (res) =>
  res.clearCookie(OAUTH_STATE_COOKIE_NAME, oauthStateOptions());
