import mongoose from "mongoose";
import config from "./config.js";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    throw error;
  }
};

export default connectDB;
