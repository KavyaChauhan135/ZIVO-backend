import multer from "multer";
import config from "../config/config.js";
import { MAX_IMAGES } from "../models/product.model.js";
import ApiError from "../utils/ApiError.js";

// Checks the file's leading bytes, since the client-sent mimetype can't be trusted.
const IMAGE_SIGNATURES = {
  "image/jpeg": (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) =>
    b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": (b) =>
    b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP",
  "image/avif": (b) =>
    b.toString("latin1", 4, 8) === "ftyp" &&
    ["avif", "avis"].includes(b.toString("latin1", 8, 12)),
};

const ALLOWED_TYPES = Object.keys(IMAGE_SIGNATURES);

const imageUpload = multer({
  // Files stay in memory only until they are streamed to ImageKit; nothing touches disk.
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
    files: MAX_IMAGES,
    fields: 30,
    fieldSize: 16 * 1024,
  },
  fileFilter(_req, file, cb) {
    if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(
      new ApiError(
        415,
        `"${file.originalname}" is not a supported image. Allowed types: JPEG, PNG, WebP, AVIF`,
      ),
    );
  },
});

const verifyImageContent = (req, _res, next) => {
  const invalid = (req.files ?? []).find(
    (file) => !IMAGE_SIGNATURES[file.mimetype]?.(file.buffer),
  );
  if (invalid) {
    throw new ApiError(415, `"${invalid.originalname}" is not a valid image file`);
  }
  next();
};

/**
 * Parses multipart/form-data with up to MAX_IMAGES files in the `images` field
 * into `req.files` (and text fields into `req.body`). Non-multipart requests pass through.
 */
export const uploadProductImages = [
  imageUpload.array("images", MAX_IMAGES),
  verifyImageContent,
];

export const MULTER_ERROR_MESSAGES = Object.freeze({
  LIMIT_FILE_SIZE: `Each image must be at most ${config.MAX_UPLOAD_SIZE_MB} MB`,
  LIMIT_FILE_COUNT: `You can upload at most ${MAX_IMAGES} images at a time`,
  LIMIT_UNEXPECTED_FILE: `Unexpected file field. Upload at most ${MAX_IMAGES} files in the "images" field`,
  LIMIT_FIELD_COUNT: "Too many form fields",
  LIMIT_FIELD_VALUE: "A form field value is too long",
  LIMIT_PART_COUNT: "Too many form parts",
});
