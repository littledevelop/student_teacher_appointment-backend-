import express from "express";
import {
  forgotPassword,
  register,
  resetPassword,
  login,
  getTeachers,
  getAllUsers,
  updateUser,
  approveUser,
  deleteUser
} from "../controllers/userController.js";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";

const userRouters = express.Router();

// Public routes
userRouters.post('/register', register);
userRouters.post('/login', login);
userRouters.post('/forgotPassword', forgotPassword);
userRouters.put('/resetPassword/:token', resetPassword);

// Protected routes
userRouters.get('/teachers', protect, getTeachers);

// Admin only routes
userRouters.get('/admin/all', protect, adminOnly, getAllUsers);
userRouters.put('/admin/:userId', protect, adminOnly, updateUser);
userRouters.put('/admin/approve/:userId', protect, adminOnly, approveUser);
userRouters.delete('/admin/:userId', protect, adminOnly, deleteUser);

export default userRouters;