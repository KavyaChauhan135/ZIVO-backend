import { body, param, query } from "express-validator";
import { CATEGORIES, MAX_PRICE, MAX_STOCK, SIZES } from "../models/product.model.js";

export const SORT_OPTIONS = Object.freeze({
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  price_asc: { price: 1, _id: 1 },
  price_desc: { price: -1, _id: -1 },
  discount: { discount: -1, _id: -1 },
});

/**
 * Fields an admin may set on a product. `discount` and `totalStock` are derived,
 * `images` is managed via uploads.
 */
export const PRODUCT_FIELDS = Object.freeze([
  "title",
  "description",
  "category",
  "sizes",
  "price",
  "originalPrice",
  "isActive",
]);

/**
 * Normalises list input from JSON (`["S","M"]`), multipart/query repeats
 * (`sizes=S&sizes=M`), comma lists (`"S,M"`) or a JSON string (`'["S","M"]'`).
 */
const toList = (value) => {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.flatMap(toList);
  if (typeof value !== "string") return [value];

  const trimmed = value.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.flatMap(toList);
    } catch {
      // Not JSON: fall through to the comma split.
    }
  }
  return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
};

const unique = (items) => [...new Set(items)];

// Accepts any casing ("t-shirt", "JEANS") and returns the canonical value.
const toCategory = (value) =>
  typeof value === "string"
    ? (CATEGORIES.find((c) => c.toLowerCase() === value.trim().toLowerCase()) ?? value)
    : value;

const toSizes = (value) =>
  unique(toList(value).map((size) => (typeof size === "string" ? size.toUpperCase() : size)));

const toStock = (value) =>
  typeof value === "string" && value.trim() !== "" ? Number(value) : value;

/**
 * Normalises per-size stock to `[{ size, stock }]`. Accepts an array
 * (`[{ "size": "M", "stock": 10 }]`), a size -> stock map (`{ "M": 10, "L": 5 }`),
 * either one as a JSON string (for multipart forms), or multipart bracket fields
 * (`sizes[M]=10` or `sizes[0][size]=M&sizes[0][stock]=10`).
 */
const toSizeStock = (value) => {
  let parsed = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return value; // reported by the validator
    }
  }
  const normalise = (size, stock) => ({
    size: typeof size === "string" ? size.trim().toUpperCase() : size,
    stock: toStock(stock),
  });
  if (Array.isArray(parsed)) {
    return parsed.map((item) =>
      item && typeof item === "object" ? normalise(item.size, item.stock) : item,
    );
  }
  if (parsed && typeof parsed === "object") {
    return Object.entries(parsed).map(([size, stock]) => normalise(size, stock));
  }
  return value;
};

const assertSizeStock = (sizes) => {
  if (!Array.isArray(sizes) || !sizes.length) {
    throw new Error(
      'sizes must be a non-empty list like [{ "size": "M", "stock": 10 }] or a map like { "M": 10 }',
    );
  }
  const seen = new Set();
  for (const item of sizes) {
    if (!item || typeof item !== "object") {
      throw new Error('Each size must be an object like { "size": "M", "stock": 10 }');
    }
    const { size, stock } = item;
    if (!SIZES.includes(size)) {
      throw new Error(`Invalid size: ${size}. Allowed: ${SIZES.join(", ")}`);
    }
    if (seen.has(size)) throw new Error(`Size ${size} is listed more than once`);
    seen.add(size);
    if (!Number.isInteger(stock) || stock < 0 || stock > MAX_STOCK) {
      throw new Error(`Stock for size ${size} must be a whole number between 0 and ${MAX_STOCK}`);
    }
  }
  return true;
};

const assertOneOf = (allowed, label) => (items) => {
  const invalid = items.filter((item) => !allowed.includes(item));
  if (invalid.length) {
    throw new Error(`Invalid ${label}: ${invalid.join(", ")}. Allowed: ${allowed.join(", ")}`);
  }
  return true;
};

const priceRule = (field, label) =>
  body(field)
    .isFloat({ min: 0.01, max: MAX_PRICE })
    .withMessage(`${label} must be a number between 0.01 and ${MAX_PRICE}`)
    .toFloat();

// --- body rules (each returns a fresh chain so create/update can differ) ---

const rules = {
  title: () =>
    body("title")
      .isString().withMessage("Title is required").bail()
      .trim()
      .isLength({ min: 3, max: 120 }).withMessage("Title must be 3-120 characters"),

  description: () =>
    body("description")
      .isString().withMessage("Description is required").bail()
      .trim()
      .isLength({ min: 10, max: 2000 }).withMessage("Description must be 10-2000 characters"),

  category: () =>
    body("category")
      .customSanitizer(toCategory)
      .isIn(CATEGORIES)
      .withMessage(`Category must be one of: ${CATEGORIES.join(", ")}`),

  // Per-size stock. On update, the list sent replaces the product's sizes entirely.
  sizes: () => body("sizes").customSanitizer(toSizeStock).custom(assertSizeStock),

  price: () => priceRule("price", "Price"),

  originalPrice: () =>
    priceRule("originalPrice", "Original price").custom((originalPrice, { req }) => {
      const price = Number(req.body.price);
      if (req.body.price !== undefined && Number.isFinite(price) && originalPrice < price) {
        throw new Error("Original price must be greater than or equal to price");
      }
      return true;
    }),

  isActive: () =>
    body("isActive").isBoolean().withMessage("isActive must be true or false").toBoolean(true),
};

export const productIdRules = [param("id").isMongoId().withMessage("Invalid product id")];

export const createProductRules = [
  rules.title(),
  rules.description(),
  rules.category(),
  rules.sizes(),
  rules.price(),
  rules.originalPrice().optional(),
  rules.isActive().optional(),
  body("images").custom((_value, { req }) => {
    if (!req.files?.length) throw new Error("At least one product image is required");
    return true;
  }),
];

export const updateProductRules = [
  ...productIdRules,
  ...PRODUCT_FIELDS.map((field) => rules[field]().optional()),
  // fileIds of existing images to delete (from the product's `images[].fileId`).
  body("removeImageIds")
    .optional()
    .customSanitizer((value) => unique(toList(value)))
    .custom((ids) => {
      if (ids.some((id) => typeof id !== "string" || id.length > 100)) {
        throw new Error("removeImageIds must be a list of image fileIds");
      }
      return true;
    }),
  body().custom((value, { req }) => {
    const hasChanges =
      [...PRODUCT_FIELDS, "removeImageIds"].some((field) => value?.[field] !== undefined) ||
      req.files?.length > 0;
    if (!hasChanges) {
      throw new Error(
        `Provide at least one of: ${PRODUCT_FIELDS.join(", ")}, removeImageIds, or new images`,
      );
    }
    return true;
  }),
];

// --- query rules for listing ---

const queryPrice = (field) =>
  query(field)
    .optional()
    .isFloat({ min: 0, max: MAX_PRICE })
    .withMessage(`${field} must be a number between 0 and ${MAX_PRICE}`)
    .toFloat();

export const listProductsRules = [
  query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer").toInt(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100")
    .toInt(),
  // Single value or list: ?category=Shirt or ?category=Shirt,Jeans
  query("category")
    .optional()
    .customSanitizer((value) => unique(toList(value).map(toCategory)))
    .custom(assertOneOf(CATEGORIES, "category")),
  // Products offered in any of the given sizes: ?sizes=M,L (with inStock, checked per size)
  query("sizes").optional().customSanitizer(toSizes).custom(assertOneOf(SIZES, "size")),
  queryPrice("minPrice"),
  queryPrice("maxPrice").custom((maxPrice, { req }) => {
    const minPrice = Number(req.query.minPrice);
    if (Number.isFinite(minPrice) && maxPrice < minPrice) {
      throw new Error("maxPrice must be greater than or equal to minPrice");
    }
    return true;
  }),
  query("inStock").optional().isBoolean().withMessage("inStock must be true or false").toBoolean(true),
  query("search")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("search must be at most 100 characters"),
  query("sort")
    .optional()
    .isIn(Object.keys(SORT_OPTIONS))
    .withMessage(`sort must be one of: ${Object.keys(SORT_OPTIONS).join(", ")}`),
];

export const adminListProductsRules = [
  ...listProductsRules,
  query("isActive").optional().isBoolean().withMessage("isActive must be true or false").toBoolean(true),
];
