import mongoose from "mongoose";
import Message from "../models/messageModel.js";
import logger from "../logger/logger.js";
const sendMessage = async (req, res) => {
  try {
    const { receiver, subject, content, appointment } = req.body;
    const sender = req.user.userId;
    console.log(sender)
    // Validation
    if (!receiver || !subject || !content) {
      return res.status(400).json({
        success: false,
        message: "Receiver, subject, and content are required",
        received: { receiver, subject, content }
      });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(receiver)) {
      return res.status(400).json({
        success: false,
        message: "Invalid receiver ID format"
      });
    }

    const newMessage = new Message({
      sender,
      receiver,
      subject,
      content,
      appointment: appointment || undefined,
    });

    await newMessage.save();

    logger.info('Message sent successfully', {
      sender,
      receiver,
      messageId: newMessage._id
    });

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      messageData: newMessage
    });
  } catch (error) {
    logger.error('Error sending message:', {
      error: error.message,
      stack: error.stack,
      sender: req.user?.userId,
      receiver: req.body?.receiver,
      errorName: error.name,
      errorCode: error.code
    });
    res.status(500).json({ 
      success: false, 
      message: "Server Error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getMessages = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10, unreadOnly = false } = req.query;

    let query = {
      $or: [
        { sender: userId },
        { receiver: userId }
      ]
    };

    if (unreadOnly === 'true') {
      query.receiver = userId;
      query.isRead = false;
    }

    const skip = (page - 1) * limit;

    const messages = await Message.find(query)
      .populate('sender', 'name email role')
      .populate('receiver', 'name email role')
      .populate('appointment', 'date time purpose status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Message.countDocuments(query);

    logger.info('Messages retrieved', {
      userId,
      count: messages.length,
      total,
      unreadOnly
    });

    res.status(200).json({
      success: true,
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching messages:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId
    });
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = await Message.findOneAndUpdate(
      { _id: messageId, receiver: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found or not authorized"
      });
    }

    logger.info('Message marked as read', {
      messageId,
      userId
    });

    res.status(200).json({
      success: true,
      message: "Message marked as read"
    });
  } catch (error) {
    logger.error('Error marking message as read:', {
      error: error.message,
      stack: error.stack,
      messageId: req.params.messageId
    });
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = await Message.findOneAndDelete({
      _id: messageId,
      $or: [
        { sender: userId },
        { receiver: userId }
      ]
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found or not authorized"
      });
    }

    logger.info('Message deleted', {
      messageId,
      userId
    });

    res.status(200).json({
      success: true,
      message: "Message deleted successfully"
    });
  } catch (error) {
    logger.error('Error deleting message:', {
      error: error.message,
      stack: error.stack,
      messageId: req.params.messageId
    });
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;

    const unreadCount = await Message.countDocuments({
      receiver: userId,
      isRead: false
    });

    res.status(200).json({
      success: true,
      unreadCount
    });
  } catch (error) {
    logger.error('Error getting unread count:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId
    });
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export { sendMessage, getMessages, markMessageAsRead, deleteMessage, getUnreadCount };