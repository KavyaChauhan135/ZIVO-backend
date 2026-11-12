/**
 *   npm run seed           create seed users (skips ones that already exist)
 *   npm run seed:fresh     delete seed users, then recreate them (resets their passwords)
 *   npm run seed:destroy   delete seed users only
 *
 * Only users whose emails are listed below are ever touched.
 * Refuses to run when NODE_ENV=production unless --force is passed.
 */

import mongoose from "mongoose";
import config from "../config/config.js";
import connectDB from "../config/db.js";
import User, { ROLES } from "../models/user.model.js";

const seedUsers = [
  {
    name: "Admin User",
    email: process.env.SEED_ADMIN_EMAIL || "admin@example.com",
    password: process.env.SEED_ADMIN_PASSWORD || "Admin@12345",
    role: ROLES.ADMIN,
  },
  {
    name: "John Doe",
    email: "john@example.com",
    password: "User@12345",
    role: ROLES.USER,
  },
  {
    name: "Jane Smith",
    email: "jane@example.com",
    password: "User@12345",
    role: ROLES.USER,
  },
];

const seedEmails = seedUsers.map((u) => u.email.toLowerCase());

const destroyUsers = async () => {
  const { deletedCount } = await User.deleteMany({
    email: { $in: seedEmails },
  });
  console.log(`Removed ${deletedCount} seed user(s)`);
};

const importUsers = async () => {
  for (const data of seedUsers) {
    if (await User.exists({ email: data.email.toLowerCase() })) {
      console.log(`  skip    ${data.email} (already exists)`);
      continue;
    }
    // User.create (not insertMany) so the pre-save hook hashes the password.
    await User.create(data);
    console.log(
      `  created ${data.email} [${data.role}] password: ${data.password}`,
    );
  }
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
      await destroyUsers();
    } else {
      if (fresh) await destroyUsers();
      console.log("Seeding users...");
      await importUsers();
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
