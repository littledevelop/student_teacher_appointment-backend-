import mongoose from "mongoose";

const availabilitySchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    title: {
      type: String,
      default: 'Available for appointments',
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

// Compound index to ensure no duplicate time slots for a teacher
availabilitySchema.index({ teacher: 1, date: 1, startTime: 1, endTime: 1 }, { unique: true });

export default mongoose.model("Availability", availabilitySchema);