import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import config from "../config/config.js";
import authRoutes from "../routes/auth.routes.js";
import userRoutes from "../routes/user.routes.js";
import { errorHandler, notFound } from "../middlewares/error.middleware.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: config.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "OK", env: config.NODE_ENV });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
