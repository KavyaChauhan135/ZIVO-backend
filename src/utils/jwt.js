import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import config from "../config/config.js";

const ALGORITHM = "HS256";

export const signAccessToken = (user) =>
  jwt.sign(
    { sub: user.id, role: user.role, type: "access" },
    config.JWT_ACCESS_SECRET,
    {
      algorithm: ALGORITHM,
      expiresIn: config.JWT_ACCESS_EXPIRES_IN,
    },
  );

export const signRefreshToken = (user) =>
  jwt.sign({ sub: user.id, type: "refresh" }, config.JWT_REFRESH_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
    jwtid: crypto.randomUUID(),
  });

const verify = (token, secret, type) => {
  const payload = jwt.verify(token, secret, { algorithms: [ALGORITHM] });
  if (payload.type !== type)
    throw new jwt.JsonWebTokenError("Invalid token type");
  return payload;
};

export const verifyAccessToken = (token) =>
  verify(token, config.JWT_ACCESS_SECRET, "access");

export const verifyRefreshToken = (token) =>
  verify(token, config.JWT_REFRESH_SECRET, "refresh");

export const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");
