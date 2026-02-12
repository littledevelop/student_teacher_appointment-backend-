import express from "express";
import cors from "cors";
import dotenv  from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import userRoutes from "./routers/userRoutes.js";
import adminRouter from "./routers/adminRoutes.js";
import appointmentRouter from "./routers/appointmentRoutes.js";
import messageRouter from "./routers/messageRoutes.js";
import availabilityRouter from "./routers/availabilityRoutes.js";
import requestLogger from "./middlewares/requestLogger.js";
import logger from "./logger/logger.js";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
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

// 404 for undefined routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

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

const PORT = parseInt(process.env.PORT, 10) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Connect to database
connectDB();

app.listen(PORT, HOST, () => {
    logger.info(`🚀 Server running on http://${HOST}:${PORT}`, {
        port: PORT,
        host: HOST,
        environment: process.env.NODE_ENV || 'development'
    });
});