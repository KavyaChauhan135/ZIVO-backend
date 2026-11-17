import ImageKit from "@imagekit/nodejs";
import config, { isImageKitEnabled } from "./config.js";
import ApiError from "../utils/ApiError.js";

// Server-side client: authenticates with the private key, so it must only ever run on the backend.
const imagekit = isImageKitEnabled
  ? new ImageKit({ privateKey: config.IMAGEKIT_PRIVATE_KEY })
  : null;

/** Blocks routes that need ImageKit with a 503 when it is not configured. */
export const requireImageKit = (_req, _res, next) => {
  if (!isImageKitEnabled) {
    throw new ApiError(503, "Image uploads are not configured");
  }
  next();
};

export default imagekit;
