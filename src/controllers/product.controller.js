import { matchedData } from "express-validator";
import Product, { MAX_IMAGES } from "../models/product.model.js";
import ApiError from "../utils/ApiError.js";
import { deleteImages, uploadImages } from "../utils/imagekit.js";
import { PRODUCT_FIELDS, SORT_OPTIONS } from "../validators/product.validator.js";

const DEFAULT_LIMIT = 12;

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Copies only admin-settable product fields, so nothing else from the request reaches the model. */
const pickProductFields = (data) =>
  Object.fromEntries(
    PRODUCT_FIELDS.filter((field) => data[field] !== undefined).map((field) => [
      field,
      data[field],
    ]),
  );

const buildFilter = ({ category, sizes, minPrice, maxPrice, inStock, search }) => {
  const filter = {};
  if (category?.length) filter.category = { $in: category };
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {
      ...(minPrice !== undefined && { $gte: minPrice }),
      ...(maxPrice !== undefined && { $lte: maxPrice }),
    };
  }

  if (sizes?.length) {
    // With sizes given, inStock looks only at those sizes: ?sizes=M&inStock=true = "M is available".
    const inSizes = { size: { $in: sizes } };
    const availableInSizes = { $elemMatch: { ...inSizes, stock: { $gt: 0 } } };
    if (inStock === true) filter.sizes = availableInSizes;
    else if (inStock === false) filter.sizes = { $elemMatch: inSizes, $not: availableInSizes };
    else filter["sizes.size"] = { $in: sizes };
  } else if (inStock === true) {
    filter.totalStock = { $gt: 0 };
  } else if (inStock === false) {
    filter.totalStock = 0;
  }

  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ title: pattern }, { description: pattern }];
  }
  return filter;
};

/** Paginated, filtered, sorted product list. `baseFilter` is always applied on top. */
const sendProductList = async (req, res, baseFilter = {}) => {
  const { page = 1, limit = DEFAULT_LIMIT, sort = "newest", ...filters } = matchedData(req, {
    locations: ["query"],
  });
  const filter = { ...buildFilter(filters), ...baseFilter };

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(SORT_OPTIONS[sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .select("-__v")
      .lean(),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      products,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  });
};

const findProductOr404 = async (filter) => {
  const product = await Product.findOne(filter);
  if (!product) throw new ApiError(404, "Product not found");
  return product;
};

// ---------- Public ----------

/**
 * GET /api/products
 * Active products only. Supports ?page=&limit=&category=&sizes=&minPrice=&maxPrice=&inStock=&search=&sort=
 */
export const listProducts = (req, res) => sendProductList(req, res, { isActive: true });

/** GET /api/products/:id (active products only) */
export const getProduct = async (req, res) => {
  const { id } = matchedData(req, { locations: ["params"] });
  const product = await findProductOr404({ _id: id, isActive: true });
  res.json({ success: true, data: { product } });
};

// ---------- Admin ----------

/** GET /api/admin/products: same filters as the public list, plus ?isActive=, including inactive products. */
export const adminListProducts = (req, res) => {
  const { isActive } = matchedData(req, { locations: ["query"] });
  return sendProductList(req, res, isActive === undefined ? {} : { isActive });
};

/** GET /api/admin/products/:id (any product, including inactive ones) */
export const adminGetProduct = async (req, res) => {
  const { id } = matchedData(req, { locations: ["params"] });
  const product = await findProductOr404({ _id: id });
  res.json({ success: true, data: { product } });
};

/**
 * POST /api/admin/products (multipart/form-data, images in the `images` field).
 * Per-size stock goes in `sizes`, e.g. `sizes={"M":10,"L":5}` or `sizes[M]=10&sizes[L]=5`.
 */
export const createProduct = async (req, res) => {
  const data = pickProductFields(matchedData(req, { locations: ["body"] }));

  const images = await uploadImages(req.files);

  let product;
  try {
    product = await Product.create({ ...data, images });
  } catch (err) {
    // Don't leave orphaned files in ImageKit when the product can't be saved.
    await deleteImages(images.map((image) => image.fileId));
    throw err;
  }

  res.status(201).json({
    success: true,
    message: "Product created",
    data: { product },
  });
};

/**
 * PUT /api/admin/products/:id
 * Accepts multipart/form-data (to add images) or JSON. Any product field may be sent;
 * new files in `images` are appended and `removeImageIds` lists fileIds to delete.
 * `sizes` replaces the whole size/stock list, so send every size the product should keep.
 */
export const updateProduct = async (req, res) => {
  const { id } = matchedData(req, { locations: ["params"] });
  const body = matchedData(req, { locations: ["body"] });
  const updates = pickProductFields(body);
  const removeImageIds = body.removeImageIds ?? [];
  const files = req.files ?? [];

  const product = await findProductOr404({ _id: id });

  const currentIds = new Set(product.images.map((image) => image.fileId));
  const unknownIds = removeImageIds.filter((fileId) => !currentIds.has(fileId));
  if (unknownIds.length) {
    throw new ApiError(400, `Image not found on this product: ${unknownIds.join(", ")}`);
  }

  const keptImages = product.images.filter((image) => !removeImageIds.includes(image.fileId));
  const imageCount = keptImages.length + files.length;
  if (imageCount < 1) {
    throw new ApiError(400, "A product must have at least one image");
  }
  if (imageCount > MAX_IMAGES) {
    throw new ApiError(
      400,
      `A product can have at most ${MAX_IMAGES} images (currently ${keptImages.length} kept + ${files.length} new)`,
    );
  }

  // Validate field changes before uploading anything, so a bad request costs no uploads.
  product.set(updates);
  await product.validate({ pathsToSkip: ["images"] });

  const uploaded = files.length ? await uploadImages(files) : [];
  product.images = [...keptImages, ...uploaded];

  try {
    await product.save();
  } catch (err) {
    await deleteImages(uploaded.map((image) => image.fileId));
    throw err;
  }

  // Only delete removed files once the database no longer references them.
  await deleteImages(removeImageIds);

  res.json({
    success: true,
    message: "Product updated",
    data: { product },
  });
};

/** DELETE /api/admin/products/:id: removes the product and all of its ImageKit images. */
export const deleteProduct = async (req, res) => {
  const { id } = matchedData(req, { locations: ["params"] });

  const product = await Product.findByIdAndDelete(id);
  if (!product) throw new ApiError(404, "Product not found");

  await deleteImages(product.images.map((image) => image.fileId));

  res.json({ success: true, message: "Product deleted" });
};
