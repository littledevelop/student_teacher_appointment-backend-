import mongoose  from "mongoose";

const appointmentSchema = new mongoose.Schema(
    {
        student:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'User',
            required:true,
        },
        teacher:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
            required:true,
        },
        date:{
            type:String,
            required:true,
        },
        time:{
            type:String,
            required:true,
        },
        purpose:{
            type:String,
            required:true,
        },
        status:{
            type:String,
            enum:["pending","approved","cancelled"],
            default:"pending",
        },
        meetingLink: {
            type: String,
            default: '',
        },
    },
    {timestamps:true}
);

export default mongoose.model("Appointment",appointmentSchema);