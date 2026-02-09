import Appointment from '../models/appointmentModel.js';
import User from '../models/userModel.js';
import mongoose from 'mongoose';
import logger from '../logger/logger.js';

const bookAppointment = async(req,res)=>{
    try{
        if(req.user.role!== 'student'){
            logger.warn('Unauthorized appointment booking attempt', {
                userId: req.user.id,
                role: req.user.role,
                action: 'bookAppointment'
            });
            return res.status(401).json({success:false,
                message:"Only Student can book appointments",
            });
        }

        const {teacherId, date, time, purpose} = req.body;

        if(!mongoose.Types.ObjectId.isValid(teacherId)){
            logger.warn('Invalid teacher ID provided', {
                userId: req.user.id,
                teacherId: teacherId
            });
            return res.status(400).json({success:false,message:"Invalid teacher ID"});
        }
        
        const teacher = await User.findOne({
                _id: teacherId,
                role: "teacher",
                approved: true,
        });
        
        if(!teacher){
            logger.warn('Teacher not found or not approved', {
                userId: req.user.id,
                teacherId: teacherId
            });
            return res.status(400).json({success:false,
                message:"Teacher not found or invalid",
            })
        }

        if(!date || !time || !purpose){
            logger.warn('Missing required fields for appointment booking', {
                userId: req.user.id,
                teacherId: teacherId,
                hasDate: !!date,
                hasTime: !!time,
                hasPurpose: !!purpose
            });
            return res.status(400).json({success:false,
                message:"Please provide all required fields",
            });
        }
        
        const existingAppointment = await Appointment.findOne({
            student: req.user.id,
            teacher: teacher._id,
            date,
            time,
            status: { $in: ["pending", "approved"] },
        });
        if(existingAppointment){
            logger.warn('Duplicate appointment booking attempt', {
                userId: req.user.id,
                teacherId: teacher._id,
                date,
                time
            });
            return res.status(400).json({success:false,
                message:"You have already booked an appointment with this teacher at the same date and time",
            });
        }

        const appointment = await Appointment.create({
            student : req.user.id,
            teacher: teacher._id,
            date,
            time,
            purpose,
        });
        
        if(!appointment){
            logger.error('Failed to create appointment', {
                userId: req.user.id,
                teacherId: teacher._id
            });
            return res.status(400).json({success:false,
                message:"Failed to book appointment",
            });
        }

        logger.info('Appointment booked successfully', {
            appointmentId: appointment._id,
            studentId: req.user.id,
            teacherId: teacher._id,
            date,
            time
        });

        return res.status(201).json({success:true,
            message:"Appointment booked successfully",
        });
    } catch (error) {
        logger.error('Error booking appointment:', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id
        });
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

const getTeacherAppointments = async (req, res) => {
    try{
        if(req.user.role !== "teacher"){
            logger.warn('Unauthorized access to teacher appointments', {
                userId: req.user.id,
                role: req.user.role
            });
            return res.status(401).json({success:false,
                message:"Only Teacher can view appointments",
            });
        }

        const appointments = await Appointment.find({teacher: req.user.id})
            .populate("student","name email")
            .sort({createdAt: -1});

        logger.info('Teacher appointments retrieved', {
            teacherId: req.user.id,
            appointmentCount: appointments.length
        });

        return res.status(200).json({success:true,
            appointments,
        });
    }catch(error){
        logger.error('Error fetching teacher appointments:', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id
        });
        return res.status(500).json({ success: false, message: "Server Error" });
    }
}

const updateTeacherAppointmentStatus = async (req, res) => {
    try{
        const { id: appointmentId } = req.params;
        const { status, meetingLink } = req.body;
        
        if(req.user.role !== "teacher"){
            logger.warn('Unauthorized appointment status update attempt', {
                userId: req.user.id,
                role: req.user.role,
                appointmentId
            });
            return res.status(401).json({success:false,
                message:"Only Teacher can update appointment status",
            });
        }

        const appointment = await Appointment.findOne({_id: appointmentId, teacher: req.user.id});
        if(!appointment){
            logger.warn('Appointment not found for status update', {
                appointmentId,
                teacherId: req.user.id
            });
            return res.status(404).json({success:false,
                message:"Appointment not found",
            });
        }

        if(!["approved","cancelled"].includes(status)){
            logger.warn('Invalid status value provided', {
                appointmentId,
                status,
                teacherId: req.user.id
            });
            return res.status(400).json({success:false,
                message:"Invalid status value",
            });
        }
        
        const oldStatus = appointment.status;
        appointment.status = status;
        if (meetingLink !== undefined) appointment.meetingLink = meetingLink;
        await appointment.save();

        logger.info('Appointment status updated', {
            appointmentId,
            teacherId: req.user.id,
            oldStatus,
            newStatus: status
        });

        return res.status(200).json({success:true,
            message:`Appointment ${status} updated successfully`,
        });

    }catch(error){
        logger.error('Error updating appointment status:', {
            error: error.message,
            stack: error.stack,
            appointmentId: req.params.id,
            userId: req.user?.id
        });
        return res.status(500).json({ success: false, message: "Server Error" });
    }
}

const getStudentAppointments = async (req, res) => {
    try{
        if(req.user.role !== "student"){
            logger.warn('Unauthorized access to student appointments', {
                userId: req.user.id,
                role: req.user.role
            });
            return res.status(401).json({success:false,
                message:"Only Student can view appointments",
            });
        }

        const appointments = await Appointment.find({student: req.user.id})
            .populate("teacher","name email")
            .sort({createdAt: -1});

        logger.info('Student appointments retrieved', {
            studentId: req.user.id,
            appointmentCount: appointments.length
        });

        return res.status(200).json({success:true,
            appointments,
        });
    }catch(error){
        logger.error('Error fetching student appointments:', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id
        });
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

const getAdminAppointments = async (req, res) => {
    try{
        if(req.user.role !== "admin"){
            logger.warn('Unauthorized access to admin appointments', {
                userId: req.user.id,
                role: req.user.role
            });
            return res.status(401).json({success:false,
                message:"Only Admin can view all appointments",
            });
        }
        const appointments = await Appointment.find()
            .populate("student","name email")
            .populate("teacher","name email")
            .sort({createdAt: -1});
        
        logger.info('Admin retrieved all appointments', {
            adminId: req.user.id,
            appointmentCount: appointments.length
        });
        
        return res.status(200).json({success:true,
            appointments,
        });
    }
    catch(error){
        logger.error('Error fetching admin appointments', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id
        });
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

const getAppointmentById = async (req, res) => {
    try{
        const { appointmentId } = req.params;
        const appointment = await Appointment.findById(appointmentId)
            .populate("student","name email")
            .populate("teacher","name email");

        if(!appointment){
            logger.warn('Appointment not found', {
                appointmentId,
                userId: req.user?.id
            });
            return res.status(404).json({success:false,
                message:"Appointment not found",
            });
        }

        logger.info('Appointment retrieved by ID', {
            appointmentId,
            userId: req.user?.id
        });

        return res.status(200).json({success:true,
            appointment,
        });
    }catch(error){
        logger.error('Error fetching appointment by ID:', {
            error: error.message,
            stack: error.stack,
            appointmentId: req.params.appointmentId,
            userId: req.user?.id
        });
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

const deleteAppointment = async (req, res) => {
    try{
        const { appointmentId } = req.params;
        if(req.user.role !== "admin"){
            logger.warn('Unauthorized appointment deletion attempt', {
                userId: req.user.id,
                role: req.user.role,
                appointmentId
            });
            return res.status(401).json({success:false,
                message:"Only Admin can delete appointments",
            });
        }   
        const appointment = await Appointment.findByIdAndDelete(appointmentId);
        if(!appointment){
            logger.warn('Appointment not found for deletion', {
                appointmentId,
                adminId: req.user.id
            });
            return res.status(404).json({success:false,
                message:"Appointment not found",
            });
        }
        
        logger.info('Appointment deleted by admin', {
            appointmentId,
            adminId: req.user.id,
            studentId: appointment.student,
            teacherId: appointment.teacher
        });
        
        return res.status(200).json({success:true,
            message:"Appointment deleted successfully",

        });
    }catch(error){
        logger.error('Error deleting appointment:', {
            error: error.message,
            stack: error.stack,
            appointmentId: req.params.appointmentId,
            userId: req.user?.id
        });
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

const updateAppointmentByStudents = async (req, res) => {
    try{
        const { id: appointmentId } = req.params;
        const { date, time, purpose, status } = req.body;   
        if(req.user.role !== "student"){
            logger.warn('Unauthorized appointment update attempt by student', {
                userId: req.user.id,
                role: req.user.role,
                appointmentId
            });
            return res.status(401).json({success:false,
                message:"Only Student can update appointments",
            });
        }
        const appointment = await Appointment.findOne({_id: appointmentId, student: req.user.id});
        if(!appointment){
            logger.warn('Appointment not found for student update', {
                appointmentId,
                studentId: req.user.id
            });
            return res.status(404).json({success:false,
                message:"Appointment not found",
            });
        }
        
        const oldData = {
            date: appointment.date,
            time: appointment.time,
            purpose: appointment.purpose,
            status: appointment.status
        };
        
        if (status === 'cancelled') {
            appointment.status = 'cancelled';
        }
        if (date !== undefined) appointment.date = date;
        if (time !== undefined) appointment.time = time;
        if (purpose !== undefined) appointment.purpose = purpose;
        await appointment.save();
        
        logger.info('Appointment updated by student', {
            appointmentId,
            studentId: req.user.id,
            oldData,
            newData: { date: appointment.date, time: appointment.time, purpose: appointment.purpose, status: appointment.status }
        });
        
        return res.status(200).json({success:true,
            message:"Appointment updated successfully",
        });
    }catch(error){
        logger.error('Error updating appointment by student:', {
            error: error.message,
            stack: error.stack,
            appointmentId: req.params.id,
            userId: req.user?.id
        });
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};


export { bookAppointment , getTeacherAppointments, updateTeacherAppointmentStatus, getStudentAppointments, getAdminAppointments, getAppointmentById, deleteAppointment, updateAppointmentByStudents };
