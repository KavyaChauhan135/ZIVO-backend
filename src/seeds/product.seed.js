/**
 *   npm run seed:products           create seed products (skips ones that already exist)
 *   npm run seed:products:fresh     delete seed products, then recreate them
 *   npm run seed:products:destroy   delete seed products only
 *
 * Only products whose titles are listed below are ever touched.
 * Refuses to run when NODE_ENV=production unless --force is passed.
 *
 * Images are placeholder URLs, not real ImageKit uploads, so their fileIds start with
 * "seed_". Deleting a seed product through the admin API will try to delete those ids
 * from ImageKit; that fails harmlessly and is only logged.
 */

import mongoose from "mongoose";
import config from "../config/config.js";
import connectDB from "../config/db.js";
import Product from "../models/product.model.js";

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Builds `count` placeholder images in the `{ url, fileId, fileName }` shape stored on products.
const placeholderImages = (title, count = 2) => {
  const slug = slugify(title);
  const text = encodeURIComponent(title).replace(/%20/g, "+");
  return Array.from({ length: count }, (_, i) => ({
    url: `https://placehold.co/800x1000/png?text=${text}${i ? `+${i + 1}` : ""}`,
    fileId: `seed_${slug}_${i + 1}`,
    fileName: `${slug}-${i + 1}.png`,
  }));
};

// Prices are in rupees. Leave originalPrice out for no discount; discount is derived by the model.
// `stock` maps each size the product comes in to its quantity (0 = that size is sold out); it is
// turned into the model's `sizes: [{ size, stock }]` below, and totalStock is derived by the model.
const seedProducts = [
  // Shirts
  {
    title: "Classic Oxford Cotton Shirt",
    description:
      "A wardrobe staple in breathable 100% cotton Oxford weave with a button-down collar and a regular fit. Works with chinos or jeans.",
    category: "Shirt",
    price: 1299,
    originalPrice: 1999,
    stock: { S: 8, M: 15, L: 14, XL: 8 },
  },
  {
    title: "Slim Fit Linen Shirt",
    description:
      "Lightweight linen-cotton blend shirt with a slim fit and a spread collar, made for hot summer days.",
    category: "Shirt",
    price: 1799,
    stock: { M: 12, L: 10, XL: 8 },
  },
  {
    title: "Checked Flannel Overshirt",
    description:
      "Brushed cotton flannel in a red and navy check. Relaxed fit with two chest pockets; wear it open over a tee or buttoned up.",
    category: "Shirt",
    price: 1499,
    originalPrice: 2499,
    stock: { M: 6, L: 7, XL: 5, XXL: 2 },
  },
  {
    title: "Formal White Poplin Shirt",
    description:
      "Crisp poplin with a cutaway collar and a tailored fit. Easy-iron finish for the office or formal events.",
    category: "Shirt",
    price: 1599,
    stock: { S: 10, M: 16, L: 16, XL: 12, XXL: 6 },
  },
  {
    title: "Denim Western Shirt",
    description:
      "Mid-wash denim shirt with snap buttons and twin flap pockets. Soft, washed cotton that gets better with wear.",
    category: "Shirt",
    price: 1899,
    originalPrice: 2299,
    stock: { M: 0, L: 0 }, // out of stock in every size
  },

  // Jeans
  {
    title: "Slim Fit Stretch Jeans",
    description:
      "Dark indigo jeans in stretch denim for all-day comfort. Slim through the thigh with a tapered leg.",
    category: "Jeans",
    price: 1999,
    originalPrice: 2999,
    stock: { S: 10, M: 15, L: 15, XL: 10 },
  },
  {
    title: "Straight Fit Rigid Jeans",
    description:
      "Classic five-pocket jeans in non-stretch 13 oz denim with a straight leg and a mid rise.",
    category: "Jeans",
    price: 2299,
    stock: { M: 7, L: 8, XL: 0, XXL: 10 }, // XL sold out, other sizes available
  },
  {
    title: "Distressed Skinny Jeans",
    description:
      "Light-wash skinny jeans with subtle rips at the knee and a frayed hem. High-stretch denim keeps its shape.",
    category: "Jeans",
    price: 1699,
    originalPrice: 2199,
    stock: { S: 4, M: 6, L: 5 },
  },
  {
    title: "Relaxed Fit Carpenter Jeans",
    description:
      "Roomy work-wear inspired jeans with a hammer loop and utility pockets, cut from durable cotton denim.",
    category: "Jeans",
    price: 2499,
    stock: { L: 5, XL: 4, XXL: 3 },
    isActive: false, // hidden from the public catalogue
  },

  // T-Shirts
  {
    title: "Essential Crew Neck T-Shirt",
    description:
      "Soft 180 GSM combed cotton tee with a regular fit and a ribbed crew neck. The everyday basic.",
    category: "T-Shirt",
    price: 499,
    originalPrice: 799,
    stock: { S: 20, M: 30, L: 30, XL: 25, XXL: 15 },
  },
  {
    title: "Oversized Graphic T-Shirt",
    description:
      "Heavyweight oversized tee with drop shoulders and a bold back print. Pre-shrunk cotton.",
    category: "T-Shirt",
    price: 899,
    stock: { M: 25, L: 25, XL: 20 },
  },
  {
    title: "Pique Polo T-Shirt",
    description:
      "Cotton pique polo with a two-button placket and ribbed collar and cuffs. Smart enough for casual Fridays.",
    category: "T-Shirt",
    price: 999,
    originalPrice: 1499,
    stock: { S: 8, M: 12, L: 12, XL: 8 },
  },
  {
    title: "Henley Full Sleeve T-Shirt",
    description:
      "Slub cotton henley with a three-button placket and full sleeves. Layers well under jackets and overshirts.",
    category: "T-Shirt",
    price: 749,
    stock: { M: 10, L: 10, XL: 10, XXL: 5 },
  },
  {
    title: "Dry-Fit Training T-Shirt",
    description:
      "Quick-dry polyester tee with moisture-wicking fabric and mesh side panels for workouts and runs.",
    category: "T-Shirt",
    price: 649,
    originalPrice: 999,
    stock: { S: 0, M: 1, L: 2, XL: 0 }, // low stock, S and XL sold out
  },
].map(({ stock, ...product }) => ({
  ...product,
  sizes: Object.entries(stock).map(([size, quantity]) => ({ size, stock: quantity })),
  images: placeholderImages(product.title),
}));

const seedTitles = seedProducts.map((p) => p.title);

const destroyProducts = async () => {
  const { deletedCount } = await Product.deleteMany({
    title: { $in: seedTitles },
  });
  console.log(`Removed ${deletedCount} seed product(s)`);
};

const importProducts = async () => {
  let created = 0;
  for (const data of seedProducts) {
    if (await Product.exists({ title: data.title })) {
      console.log(`  skip    ${data.title} (already exists)`);
      continue;
    }
    // Product.create (not insertMany) so the pre-validate hook derives discount and totalStock
    // and sorts sizes.
    const product = await Product.create(data);
    created += 1;
    const soldOut = product.sizes.filter((s) => s.stock === 0).map((s) => s.size);
    const flags = [
      product.discount && `${product.discount}% off`,
      product.totalStock === 0
        ? "out of stock"
        : soldOut.length && `sold out in ${soldOut.join(", ")}`,
      !product.isActive && "inactive",
    ].filter(Boolean);
    const stockBySize = product.sizes.map((s) => `${s.size}:${s.stock}`).join(" ");
    console.log(
      `  created ${product.title} [${product.category}] ₹${product.price}` +
        ` stock ${stockBySize} (total ${product.totalStock})` +
        (flags.length ? ` (${flags.join(", ")})` : ""),
    );
  }
  console.log(`Created ${created} product(s)`);
};

const run = async () => {
  const args = process.argv.slice(2);
  const destroy = args.includes("--destroy");
  const fresh = args.includes("--fresh");

  if (config.isProduction && !args.includes("--force")) {
    console.error(
      "Refusing to seed in production. Pass --force if you really mean it.",
    );
    process.exit(1);
  }

  await connectDB();

  try {
    if (destroy) {
      await destroyProducts();
    } else {
      if (fresh) await destroyProducts();
      console.log("Seeding products...");
      await importProducts();
    }
    console.log("Done");
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
