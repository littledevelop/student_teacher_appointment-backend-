import Availability from "../models/availabilityModel.js";
import logger from "../logger/logger.js";

const createAvailability = async (req, res) => {
  try {
    const { date, startTime, endTime, title, notes } = req.body;
    const teacher = req.user.userId;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Date, start time, and end time are required"
      });
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({
        success: false,
        message: "Invalid time format. Use HH:MM format"
      });
    }

    // Check if start time is before end time
    if (startTime >= endTime) {
      return res.status(400).json({
        success: false,
        message: "Start time must be before end time"
      });
    }

    const newAvailability = new Availability({
      teacher,
      date: new Date(date),
      startTime,
      endTime,
      title: title || 'Available for appointments',
      notes,
    });

    await newAvailability.save();

    logger.info('Availability created successfully', {
      teacher,
      availabilityId: newAvailability._id,
      date,
      startTime,
      endTime
    });

    res.status(201).json({
      success: true,
      message: "Availability scheduled successfully",
      availability: newAvailability
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You already have availability scheduled for this time slot"
      });
    }

    logger.error('Error creating availability:', {
      error: error.message,
      stack: error.stack,
      teacher: req.user?.userId
    });
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getTeacherAvailability = async (req, res) => {
  try {
    const teacher = req.user.userId;
    const { startDate, endDate } = req.query;

    let query = { teacher };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const availability = await Availability.find(query)
      .sort({ date: 1, startTime: 1 });

    logger.info('Teacher availability retrieved', {
      teacher,
      count: availability.length,
      dateRange: { startDate, endDate }
    });

    res.status(200).json({
      success: true,
      availability
    });
  } catch (error) {
    logger.error('Error fetching teacher availability:', {
      error: error.message,
      stack: error.stack,
      teacher: req.user?.userId
    });
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getAvailableSlots = async (req, res) => {
  try {
    const { teacherId, date } = req.query;

    if (!teacherId || !date) {
      return res.status(400).json({
        success: false,
        message: "Teacher ID and date are required"
      });
    }

    const availability = await Availability.find({
      teacher: teacherId,
      date: new Date(date),
      isAvailable: true
    }).sort({ startTime: 1 });

    logger.info('Available slots retrieved', {
      teacherId,
      date,
      slotsCount: availability.length
    });

    res.status(200).json({
      success: true,
      availability
    });
  } catch (error) {
    logger.error('Error fetching available slots:', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const updateAvailability = async (req, res) => {
  try {
    const { availabilityId } = req.params;
    const teacher = req.user.userId;
    const updateData = req.body;

    const availability = await Availability.findOneAndUpdate(
      { _id: availabilityId, teacher },
      updateData,
      { new: true, runValidators: true }
    );

    if (!availability) {
      return res.status(404).json({
        success: false,
        message: "Availability not found or not authorized"
      });
    }

    logger.info('Availability updated successfully', {
      availabilityId,
      teacher,
      changes: Object.keys(updateData)
    });

    res.status(200).json({
      success: true,
      message: "Availability updated successfully",
      availability
    });
  } catch (error) {
    logger.error('Error updating availability:', {
      error: error.message,
      stack: error.stack,
      availabilityId: req.params.availabilityId
    });
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const deleteAvailability = async (req, res) => {
  try {
    const { availabilityId } = req.params;
    const teacher = req.user.userId;

    const availability = await Availability.findOneAndDelete({
      _id: availabilityId,
      teacher
    });

    if (!availability) {
      return res.status(404).json({
        success: false,
        message: "Availability not found or not authorized"
      });
    }

    logger.info('Availability deleted successfully', {
      availabilityId,
      teacher
    });

    res.status(200).json({
      success: true,
      message: "Availability deleted successfully"
    });
  } catch (error) {
    logger.error('Error deleting availability:', {
      error: error.message,
      stack: error.stack,
      availabilityId: req.params.availabilityId
    });
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export { createAvailability, getTeacherAvailability, getAvailableSlots, updateAvailability, deleteAvailability };