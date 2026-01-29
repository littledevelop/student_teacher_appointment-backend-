import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique:true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "student", "teacher"],
      required: true,
      default:"student",
    },
    approved: {
      type: Boolean,
      default: false,
    },
    // Additional fields for teachers
    department: {
      type: String,
      required: function() { return this.role === 'teacher'; }
    },
    subject: {
      type: String,
      required: function() { return this.role === 'teacher'; }
    },
    specialization: {
      type: String,
    },
    officeHours: {
      type: String,
    },
    bio: {
      type: String,
    },
    // Additional fields for students
    studentId: {
      type: String,
    },
    year: {
      type: String,
    },
    course: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
