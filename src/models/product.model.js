import mongoose from "mongoose";

// Men's clothing only.
export const CATEGORIES = Object.freeze(["Shirt", "Jeans", "T-Shirt"]);
export const SIZES = Object.freeze(["S", "M", "L", "XL", "XXL"]);
export const MAX_IMAGES = 8;
export const MAX_PRICE = 10_000_000;
export const MAX_STOCK = 1_000_000;

const roundMoney = (value) =>
  typeof value === "number" ? Math.round(value * 100) / 100 : value;

// Stock is tracked per size; a product only comes in the sizes listed here.
const sizeStockSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      required: [true, "Size is required"],
      enum: {
        values: SIZES,
        message: `Size must be one of: ${SIZES.join(", ")}`,
      },
    },
    stock: {
      type: Number,
      required: [true, "Stock is required for every size"],
      min: [0, "Stock cannot be negative"],
      max: [MAX_STOCK, `Stock must be at most ${MAX_STOCK}`],
      validate: {
        validator: Number.isInteger,
        message: "Stock must be a whole number",
      },
    },
  },
  { _id: false },
);

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    // ImageKit's id for the file; needed to delete it later.
    fileId: { type: String, required: true },
    fileName: { type: String, required: true },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [120, "Title must be at most 120 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters"],
      maxlength: [2000, "Description must be at most 2000 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: CATEGORIES,
        message: `Category must be one of: ${CATEGORIES.join(", ")}`,
      },
    },
    // e.g. [{ size: "M", stock: 10 }, { size: "L", stock: 0 }]. Stock 0 = that size is sold out.
    sizes: {
      type: [sizeStockSchema],
      validate: [
        {
          validator: (sizes) => sizes.length > 0,
          message: "At least one size is required",
        },
        {
          validator: (sizes) => new Set(sizes.map((s) => s.size)).size === sizes.length,
          message: "Each size can only be listed once",
        },
      ],
    },
    // Selling price.
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0.01, "Price must be greater than 0"],
      max: [MAX_PRICE, `Price must be at most ${MAX_PRICE}`],
      set: roundMoney,
    },
    // MRP / price before discount. Defaults to `price` (no discount).
    originalPrice: {
      type: Number,
      min: [0.01, "Original price must be greater than 0"],
      max: [MAX_PRICE, `Original price must be at most ${MAX_PRICE}`],
      set: roundMoney,
      validate: {
        validator(value) {
          return value >= this.price;
        },
        message: "Original price must be greater than or equal to price",
      },
    },
    // Whole-number percentage, always derived from price and originalPrice.
    discount: { type: Number, min: 0, max: 100, default: 0 },
    // Sum of every size's stock, derived on validate; used for in-stock filtering.
    // Anything that changes `sizes.stock` with a raw update ($inc etc.) must update this too.
    totalStock: { type: Number, min: 0, default: 0 },
    images: {
      type: [imageSchema],
      validate: {
        validator: (images) =>
          images.length >= 1 && images.length <= MAX_IMAGES,
        message: `A product must have between 1 and ${MAX_IMAGES} images`,
      },
    },
    // Inactive products are hidden from the public catalogue but kept for admins.
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    // Concurrent admin edits fail with a VersionError instead of overwriting each other's image changes.
    optimisticConcurrency: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

productSchema.index({ isActive: 1, createdAt: -1 });
productSchema.index({ isActive: 1, category: 1, price: 1 });
productSchema.index({ isActive: 1, "sizes.size": 1 });

// Unknown sizes sort last; the enum validator reports them.
const sizeRank = (size) => {
  const index = SIZES.indexOf(size);
  return index === -1 ? SIZES.length : index;
};

productSchema.pre("validate", function () {
  if (this.originalPrice == null) this.originalPrice = this.price;

  // Keep sizes in S -> XXL order.
  if (this.isModified("sizes")) {
    this.sizes = this.sizes
      .map(({ size, stock }) => ({ size, stock }))
      .sort((a, b) => sizeRank(a.size) - sizeRank(b.size));
  }

  this.totalStock = this.sizes.reduce(
    (sum, { stock }) => sum + (Number.isInteger(stock) && stock > 0 ? stock : 0),
    0,
  );

  this.discount =
    this.originalPrice > 0 && this.price < this.originalPrice
      ? Math.round((1 - this.price / this.originalPrice) * 100)
      : 0;
});

const Product = mongoose.model("Product", productSchema);

export default Product;
