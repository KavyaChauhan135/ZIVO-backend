import config from "../config/config.js";
import ApiError from "../utils/ApiError.js";
import { MULTER_ERROR_MESSAGES } from "./upload.middleware.js";

export const notFound = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal Server Error";
  let details = err.details;

  if (err.code === 11000) {
    statusCode = 409;
    const fields = Object.keys(err.keyValue || {});
    message = `${fields.join(", ") || "Value"} already in use`;
  } else if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}`;
  } else if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Malformed JSON in request body";
  } else if (err.name === "MulterError") {
    statusCode = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    message = MULTER_ERROR_MESSAGES[err.code] || err.message;
  } else if (err.name === "VersionError") {
    statusCode = 409;
    message = "This record was changed by another request. Please reload and try again";
  }

  if (statusCode >= 500) {
    console.error(err);
    if (config.isProduction) message = "Internal Server Error";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details && { errors: details }),
    ...(!config.isProduction && statusCode >= 500 && { stack: err.stack }),
  });
};
