import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["student", "teacher", "admin"],
      default: "student",
    },
    approved: {
      type: Boolean,
      default: false,
    },
    // Teacher fields
    department: { type: String, default: "" },
    subject: { type: String, default: "" },
    specialization: { type: String, default: "" },
    officeHours: { type: String, default: "" },
    bio: { type: String, default: "" },
    // Student fields
    studentId: { type: String, default: "" },
    year: { type: String, default: "" },
    course: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
