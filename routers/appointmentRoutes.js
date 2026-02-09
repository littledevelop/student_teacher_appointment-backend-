import express from "express";
import {bookAppointment,getStudentAppointments,getTeacherAppointments,updateTeacherAppointmentStatus, updateAppointmentByStudents, getAppointmentById, getAdminAppointments, deleteAppointment} from '../controllers/appointmentController.js';
import { protect, adminOnly } from "../middlewares/authMiddleware.js";

const appointmentRouter = express.Router();

appointmentRouter.post("/book", protect, bookAppointment); 
appointmentRouter.get("/teacher", protect, getTeacherAppointments);   
appointmentRouter.put("/update/:id", protect, updateTeacherAppointmentStatus);
appointmentRouter.get("/student", protect, getStudentAppointments);
appointmentRouter.put("/updateStudentAppointment/:id", protect, updateAppointmentByStudents); 
appointmentRouter.get("/appointment/:appointmentId", protect, getAppointmentById);
appointmentRouter.get("/admin/all", protect, adminOnly, getAdminAppointments);
appointmentRouter.delete("/:id", protect, adminOnly, deleteAppointment);

export default appointmentRouter;