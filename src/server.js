import mongoose from "mongoose";
import app from "./app/app.js";
import config from "./config/config.js";
import connectDB from "./config/db.js";

try {
  await connectDB();
} catch {
  process.exit(1);
}

const server = app.listen(config.PORT, () => {
  console.log(
    `Server running in ${config.NODE_ENV} mode on port ${config.PORT}`,
  );
});

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down...`);
  server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
