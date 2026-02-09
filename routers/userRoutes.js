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

const userRoutes = express.Router();

// Public routes
userRoutes.post('/register', register);
userRoutes.post('/login', login);
userRoutes.post('/forgotPassword', forgotPassword);
userRoutes.put('/resetPassword/:token', resetPassword);

// Protected routes
userRoutes.get('/teachers', protect, getTeachers);

// Admin only routes
userRoutes.get('/admin/all', protect, adminOnly, getAllUsers);
userRoutes.put('/admin/:userId', protect, adminOnly, updateUser);
userRoutes.put('/admin/approve/:userId', protect, adminOnly, approveUser);
userRoutes.delete('/admin/:userId', protect, adminOnly, deleteUser);

export default userRoutes;
