import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, default: "" },
    content: { type: String, default: "" },
    message: { type: String, default: "" },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", default: null },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
