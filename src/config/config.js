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
});

export default config;
