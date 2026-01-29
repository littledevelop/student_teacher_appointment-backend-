import mongoose from "mongoose";
import logger from "../logger/logger.js";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info("✅ MongoDB Connected Successfully", {
      database: mongoose.connection.name,
      host: mongoose.connection.host
    });
    
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', {
        error: err.message,
        stack: err.stack
      });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
  } catch (error) {
    logger.error("❌ MongoDB Connection Failed:", {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

export default connectDB;