import bcrypt, { genSalt } from "bcryptjs";
import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import axios from "axios";
import logger from "../logger/logger.js";
const register = async (req, res) => {
  try {
    const { name, email, password, role, department, subject, specialization, officeHours, bio, studentId, year, course } = req.body;

    if (!name || !email || !password || !role)
      return res
        .status(400)
        .json({ success: false, message: "All Fields are required" });

    // Additional validation for teachers
    if (role === 'teacher' && (!department || !subject)) {
      return res
        .status(400)
        .json({ success: false, message: "Department and Subject are required for teachers" });
    }

    const existingUser = await userModel.findOne({ email });
    if (existingUser)
      return res
        .status(400)
        .json({ success: false, message: "user already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Set approval based on role: admins are auto-approved, others need approval
    const approvedBoolean = role === "admin" ? true : false;

    const newUser = new userModel({
      name,
      email,
      password: hashedPassword,
      role,
      approved: approvedBoolean,
      // Teacher fields
      department: role === 'teacher' ? department : undefined,
      subject: role === 'teacher' ? subject : undefined,
      specialization: role === 'teacher' ? specialization : undefined,
      officeHours: role === 'teacher' ? officeHours : undefined,
      bio: role === 'teacher' ? bio : undefined,
      // Student fields
      studentId: role === 'student' ? studentId : undefined,
      year: role === 'student' ? year : undefined,
      course: role === 'student' ? course : undefined,
    });

    await newUser.save();

    //generater json jwt token

    const token = jwt.sign(
      {
        userId: newUser._id,
        email: newUser.email,
        role: newUser.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.cookie("token",token, {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const userResponse = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      approved: newUser.approved,
    };
    logger.info(`New user registered: ${email}, role: ${role}`);

    return res.status(201).json({
      success: true,
      message: "Registeration is successfully",
      user: userResponse,
      token,
    });
  } catch (error) {
    logger.error('Error during user registration:', {
      error: error.message,
      stack: error.stack,
      email: req.body?.email
    });
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      logger.warn('Login attempt with missing fields', {
        email: email || 'missing',
        hasPassword: !!password
      });
      return res
        .status(401)
        .json({ success: false, message: "All fields are required" });
    }

    const user = await userModel.findOne({email});
    if (!user) {
      logger.warn('Login attempt with invalid email', {
        email
      });
      return res
        .status(401)
        .json({ success: false, message: "Invalid Credentials" });
    }

    if(!user.approved) {
      logger.warn('Login attempt by unapproved user', {
        userId: user._id,
        email,
        role: user.role
      });
      return res.status(401).json({success:false,message:"Admin Approval Required"});
    }

    const isPasswordValid = await bcrypt.compare(password,user.password);
    if(!isPasswordValid) {
      logger.warn('Login attempt with invalid password', {
        userId: user._id,
        email
      });
      return res.status(401).json({success:false,message:"Invalid Credentials"});
    }
    
    const token = jwt.sign({
      userId: user._id,
      email:user.email,
      role:user.role,
    },
    process.env.JWT_SECRET,
    {expiresIn:"7d"}
  );

  res.cookie("token", token, {
    httpOnly:false,
    secure:false,
    sameSite:"Lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
   
  const userResponse= {
    id: user._id,
    name: user.name,
    email:user.email,
    role:user.role,
    approved:user.approved,
    token:token, 
  };

  logger.info('User logged in successfully', {
    userId: user._id,
    email,
    role: user.role
  });

  return res.status(201).json({
    success:true,
    message:"User Logged in Successfully",
    user:userResponse,
    token,
  })

  } catch (error) {
    logger.error('Error during user login:', {
      error: error.message,
      stack: error.stack,
      email: req.body?.email
    });
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const sendResetPasswordEmail = async(toEmail,resetLink)=>{
  try{
    await axios.post("http://api.brevo.com/v3/smtp/email",{
      sender:{
        name:process.env.FROM_NAME,
        email:process.env.FROM_EMAIL,
      },
      to:[{email:toEmail}],
      subject:"Password Reset Request",
      htmlContent:`
      <div style="font-family:Arial,sans-serif;">
        <h2>Password Reset</h2>
        <p>You requested to reset your password.</p>
        <p>
          <a href="${resetLink}" style="background:#2563ee;color:#fff;padding:12px 18px; text-decoration:none;border-radius:5px;>Reset Password</a>
        </p>
        <p>This Link is Valid for 15 Minutes.</p>
        <p>If you didn't request this,please ignore.</p>
      </div>`,
    },
  {
    headers:{
      "api-key":process.env.BREVO_API_KEY,
      "content-type":"application/json",
      "accept":"application/json",
    },
    timeout:10000,
  });
    logger.info('Password reset email sent successfully', {
      email: toEmail
    });
  }catch(error){
    logger.error("Brevo Email Error:", {
      error: error.response?.data || error.message,
      email: toEmail,
      stack: error.stack
    });
    throw new Error("Email sending failed");
  }
};

const forgotPassword = async(req,res)=>{
  try{
      const {email} = req.body;
      if(!email) {
        logger.warn('Forgot password request with blank email');
        return res.status(400).json({success:false,message:"Email Should not be blank"});
      }

      const user =await userModel.findOne({email});

      if(user){
        const token = jwt.sign({userId: user._id},process.env.JWT_SECRET,{expiresIn:"15m",});
        const resetLink = `${process.env.FRONTEND_URL}/resetPassword/${token}`;
        
        logger.info('Password reset token generated', {
          userId: user._id,
          email
        });

        await sendResetPasswordEmail(user.email,resetLink);
      } else {
        logger.warn('Password reset requested for non-existent email', {
          email
        });
      }
      
      res.json({success:true,message:"If this email exists, a reset link has been sent"});
  }catch(error){
    logger.error('Error in forgot password:', {
      error: error.message,
      stack: error.stack,
      email: req.body?.email
    });
    res.status(500).json({success:false,message:"Server Error"});
  }
};

const resetPassword = async(req,res)=>{
  try{
    const {password} = req.body;
    const {token} = req.params;

    if(!password){
      logger.warn('Password reset attempt without password');
      return res.status(400).json({success:false,message:"Password is must be required"});
    }
    
    if(!token){
      logger.warn('Password reset attempt without token');
      return res.status(400).json({success:false,message:"Unauthorized request"});
    }
     
    //verify token
    const decoded = jwt.verify(token,process.env.JWT_SECRET);

    //Hash new password
    const hashedPassword = await bcrypt.hash(password,10);

    //Update User Password 
    const user = await userModel.findByIdAndUpdate(decoded.userId,{password:hashedPassword},{new:true})

    if(!user){
      logger.warn('User not found for password reset', {
        userId: decoded.userId
      });
      return res.status(404).json({success:false,message:"User Not Found"});
    }

    logger.info('Password reset successfully', {
      userId: user._id,
      email: user.email
    });

    res.status(200).json({success:true,message:"Password Updated Successfully"});
  }catch(error){
    //Token Expired or Invalid
    if(error.name === "TokenExpiredError"){
      logger.warn('Password reset attempt with expired token');
      return res.status(401).json({success:false,message:"Reset Link Expired"});
    }

    if(error.name==="JsonWebTokenError"){
      logger.warn('Password reset attempt with invalid token');
      return res.status(401).json({success:false,message:"Invalid reset token"});
    }

    logger.error('Error resetting password:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({success:false,message:"Server Error"});

  }
};

const getTeachers = async (req, res) => {
  try {
    const { search, department, subject } = req.query;

    let query = {
      role: 'teacher',
      approved: true
    };

    // Add search filters
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    if (department) {
      query.department = { $regex: department, $options: 'i' };
    }

    if (subject) {
      query.subject = { $regex: subject, $options: 'i' };
    }

    const teachers = await userModel.find(query).select('name email _id department subject specialization officeHours bio');

    logger.info('Teachers list retrieved', {
      count: teachers.length,
      filters: { search, department, subject }
    });

    res.status(200).json({
      success: true,
      teachers
    });
  } catch (error) {
    logger.error('Error fetching teachers:', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { role, approved, page = 1, limit = 10 } = req.query;

    let query = {};

    if (role) {
      query.role = role;
    }

    if (approved !== undefined) {
      query.approved = approved === 'true';
    }

    const skip = (page - 1) * limit;

    const users = await userModel.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await userModel.countDocuments(query);

    logger.info('Users list retrieved', {
      count: users.length,
      total,
      filters: { role, approved }
    });

    res.status(200).json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching users:', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    // Remove sensitive fields that shouldn't be updated directly
    delete updateData.password;
    delete updateData.email;

    // Validate teacher fields if role is teacher
    if (updateData.role === 'teacher' && (!updateData.department || !updateData.subject)) {
      return res.status(400).json({
        success: false,
        message: "Department and Subject are required for teachers"
      });
    }

    const user = await userModel.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    logger.info('User updated successfully', {
      userId,
      updatedBy: req.user?.userId,
      changes: Object.keys(updateData)
    });

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user
    });
  } catch (error) {
    logger.error('Error updating user:', {
      error: error.message,
      stack: error.stack,
      userId: req.params.userId
    });
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const approveUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { approved } = req.body;

    const user = await userModel.findByIdAndUpdate(
      userId,
      { approved: approved === true || approved === 'true' },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    logger.info('User approval status updated', {
      userId,
      approved: user.approved,
      updatedBy: req.user?.userId
    });

    res.status(200).json({
      success: true,
      message: `User ${user.approved ? 'approved' : 'disapproved'} successfully`,
      user
    });
  } catch (error) {
    logger.error('Error updating user approval:', {
      error: error.message,
      stack: error.stack,
      userId: req.params.userId
    });
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await userModel.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    logger.info('User deleted successfully', {
      userId,
      deletedBy: req.user?.userId,
      userRole: user.role
    });

    res.status(200).json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    logger.error('Error deleting user:', {
      error: error.message,
      stack: error.stack,
      userId: req.params.userId
    });
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export {register, login, forgotPassword, resetPassword, getTeachers, getAllUsers, updateUser, approveUser, deleteUser};              