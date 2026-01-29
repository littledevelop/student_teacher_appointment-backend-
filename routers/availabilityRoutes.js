import express from "express";
import {
  createAvailability,
  getTeacherAvailability,
  getAvailableSlots,
  updateAvailability,
  deleteAvailability
} from "../controllers/availabilityController.js";
import { protect } from "../middlewares/authMiddleware.js";

const availabilityRouter = express.Router();

// All availability routes require authentication
availabilityRouter.use(protect);

availabilityRouter.post('/', createAvailability);
availabilityRouter.get('/teacher', getTeacherAvailability);
availabilityRouter.get('/slots', getAvailableSlots);
availabilityRouter.put('/:availabilityId', updateAvailability);
availabilityRouter.delete('/:availabilityId', deleteAvailability);

export default availabilityRouter;