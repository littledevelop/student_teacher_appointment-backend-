import { Types } from "mongoose";
import jwt from "jsonwebtoken";
import logger from "../logger/logger.js";

export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Unauthorized access attempt - No token provided', {
        path: req.path,
        method: req.method,
        ip: req.ip || req.connection.remoteAddress
      });
      return res.status(401).json({ success: false, message: "unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      logger.warn('Unauthorized access attempt - Invalid token format', {
        path: req.path,
        method: req.method,
        ip: req.ip || req.connection.remoteAddress
      });
      return res.status(401).json({ success: false, message: "unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded || !decoded.userId || !Types.ObjectId.isValid(decoded.userId)) {
      logger.warn('Unauthorized access attempt - Invalid token payload', {
        path: req.path,
        method: req.method,
        ip: req.ip || req.connection.remoteAddress
      });
      return res.status(401).json({ success: false, message: "unauthorized" });
    }

    req.user = { id: decoded.userId, role: decoded.role };
    logger.debug('User authenticated', {
      userId: decoded.userId,
      role: decoded.role,
      path: req.path
    });
    next();
  } catch (error) {
    logger.error('Authentication error:', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      ip: req.ip || req.connection.remoteAddress
    });
    return res.status(401).json({ success: false, message: "Server Error" });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    logger.warn('Admin access denied', {
      userId: req.user.id,
      role: req.user.role,
      path: req.path,
      method: req.method
    });
    return res
      .status(401)
      .json({ success: false, message: "Admin access only" });
  }
  logger.debug('Admin access granted', {
    userId: req.user.id,
    path: req.path
  });
  next();
};

