import express from "express";
import cors from "cors";
import dotenv  from "dotenv";
import connectDB from "./config/db.js";
import userRoutes from "./routers/userRoutes.js";
import adminRouter from "./routers/adminRoutes.js";
import appointmentRouter from "./routers/appointmentRoutes.js";
import messageRouter from "./routers/messageRoutes.js";
import availabilityRouter from "./routers/availabilityRoutes.js";
import requestLogger from "./middlewares/requestLogger.js";
import logger from "./logger/logger.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors({
  origin: true, // Allow all origins
  credentials: true
}));
app.use(requestLogger);

app.get("/",(req,res)=>{
    res.send("Student-Teacher Appointment API Running");
})

app.use("/api", userRoutes);
app.use("/api/admin", adminRouter);
app.use("/api/appointments", appointmentRouter);
app.use("/api/messages", messageRouter);
app.use("/api/availability", availabilityRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();

app.listen(PORT, () => {
    logger.info(`🚀 Server running on PORT ${PORT}`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
    });
});