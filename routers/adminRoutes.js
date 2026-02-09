import express from 'express';
import {protect,adminOnly} from '../middlewares/authMiddleware.js';
import { getAdminAppointments,deleteAppointment } from '../controllers/appointmentController.js';
const adminRouter =  express.Router();

adminRouter.get("/",protect,adminOnly,(req,res) => {
    res.json({message:"Welcome Admin"});
});

adminRouter.get("/all",protect,adminOnly,getAdminAppointments);
adminRouter.delete("/delete/:appointmentId",protect,adminOnly,deleteAppointment);

export default adminRouter;

