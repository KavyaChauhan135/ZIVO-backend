import { NotFoundError, toFile } from "@imagekit/nodejs";
import config from "../config/config.js";
import imagekit from "../config/imagekit.js";
import ApiError from "./ApiError.js";

export const PRODUCT_IMAGE_FOLDER = `${config.IMAGEKIT_FOLDER.replace(/\/+$/, "")}/products`;

const getClient = () => {
  if (!imagekit) throw new ApiError(503, "Image uploads are not configured");
  return imagekit;
};

// ImageKit only keeps a-z, 0-9, ".", "_" and "-" in file names; normalise so stored names match.
const safeFileName = (name) =>
  (name || "image")
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^[-.]+/, "")
    .slice(-100) || "image";

/**
 * Uploads one multer file (memory storage) to ImageKit.
 * Returns the `{ url, fileId, fileName }` shape stored on products.
 */
export const uploadImage = async (file, { folder = PRODUCT_IMAGE_FOLDER, tags } = {}) => {
  const fileName = safeFileName(file.originalname);
  const result = await getClient().files.upload({
    file: await toFile(file.buffer, fileName, { type: file.mimetype }),
    fileName,
    folder,
    tags,
    useUniqueFileName: true,
  });
  return { url: result.url, fileId: result.fileId, fileName: result.name };
};

/**
 * Deletes ImageKit files by id. Files that are already gone count as deleted.
 * Never throws: a failed delete only leaves an orphaned file in ImageKit, which must
 * not fail a request whose database change already succeeded, so failures are logged.
 */
export const deleteImages = async (fileIds = []) => {
  if (!fileIds.length || !imagekit) return;

  const results = await Promise.allSettled(
    fileIds.map((fileId) => imagekit.files.delete(fileId)),
  );

  const failed = results
    .map((result, i) => ({ result, fileId: fileIds[i] }))
    .filter(
      ({ result }) =>
        result.status === "rejected" && !(result.reason instanceof NotFoundError),
    );

  for (const { fileId, result } of failed) {
    console.error(`Failed to delete ImageKit file ${fileId}:`, result.reason?.message);
  }
};

/**
 * Uploads all files in parallel. All-or-nothing: if any upload fails, the ones that
 * succeeded are deleted again and a 502 is thrown.
 */
export const uploadImages = async (files, options) => {
  const results = await Promise.allSettled(files.map((file) => uploadImage(file, options)));

  const uploaded = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  const failure = results.find((r) => r.status === "rejected");

  if (failure) {
    console.error("ImageKit upload failed:", failure.reason?.message);
    await deleteImages(uploaded.map((image) => image.fileId));
    throw new ApiError(502, "Failed to upload images. Please try again");
  }

  return uploaded;
};
