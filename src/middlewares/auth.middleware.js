import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import { verifyAccessToken } from "../utils/jwt.js";

/** Requires a valid `Authorization: Bearer <accessToken>` header. Sets `req.user`. */
export const protect = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new ApiError(401, "Not authenticated. Access token missing");
  }

  let payload;

  try {
    payload = verifyAccessToken(header.slice(7).trim());
  } catch (err) {
    throw new ApiError(
      401,
      err.name === "TokenExpiredError"
        ? "Access token expired"
        : "Invalid access token",
    );
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw new ApiError(401, "User no longer exists or is deactivated");
  }
  if (user.changedPasswordAfter(payload.iat)) {
    throw new ApiError(
      401,
      "Password was changed recently. Please log in again",
    );
  }

  req.user = user;
  next();
};

/** Restricts a route to the given roles. Use after `protect`. */
export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(
        403,
        "You do not have permission to perform this action",
      );
    }
    next();
  };
