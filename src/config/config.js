import dotenv from "dotenv";
dotenv.config({ quiet: true });

const REQUIRED_VARS = ["MONGO_URI", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(
    `Missing required environment variables: ${missing.join(", ")}`,
  );
  process.exit(1);
}

if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
  console.error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different");
  process.exit(1);
}

const NODE_ENV = process.env.NODE_ENV || "development";

const config = Object.freeze({
  NODE_ENV,
  isProduction: NODE_ENV === "production",
  PORT: Number(process.env.PORT) || 3000,
  MONGO_URI: process.env.MONGO_URI,
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",

  COOKIE_SAME_SITE: process.env.COOKIE_SAME_SITE || "strict",
  MAX_SESSIONS: Number(process.env.MAX_SESSIONS) || 5,

  // Google OAuth is optional: the /api/auth/google routes return 503 unless all three are set.
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL:
    process.env.GOOGLE_CALLBACK_URL ||
    `http://localhost:${Number(process.env.PORT) || 3000}/api/auth/google/callback`,
  // Frontend page the user is sent to after Google sign-in (success or failure).
  OAUTH_SUCCESS_REDIRECT:
    process.env.OAUTH_SUCCESS_REDIRECT ||
    `${process.env.CLIENT_URL || "http://localhost:5173"}/oauth/callback`,
});

export const isGoogleOAuthEnabled = Boolean(
  config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET,
);

export default config;
