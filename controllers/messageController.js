import mongoose from "mongoose";
import Message from "../models/messageModel.js";
import logger from "../logger/logger.js";
const sendMessage = async (req, res) => {
  try {
    const { receiver, subject, content, appointment } = req.body;
    const sender = req.user.id;
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
    const userId = req.user.id;
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
    const userId = req.user.id;

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
    const userId = req.user.id;

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
    const userId = req.user.id;

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

const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    // Get all messages involving the user
    const messages = await Message.find({
      $or: [
        { sender: userId },
        { receiver: userId }
      ]
    })
    .populate('sender', 'name email role')
    .populate('receiver', 'name email role')
    .sort({ createdAt: -1 });

    // Group messages by conversation (other participant)
    const conversationsMap = new Map();

    messages.forEach(message => {
      const otherUser = message.sender._id.toString() === userId.toString()
        ? message.receiver
        : message.sender;

      const conversationKey = otherUser._id.toString();

      if (!conversationsMap.has(conversationKey)) {
        conversationsMap.set(conversationKey, {
          otherUser,
          messages: [],
          lastMessage: message,
          unreadCount: 0
        });
      }

      const conversation = conversationsMap.get(conversationKey);
      conversation.messages.push(message);

      // Count unread messages
      if (message.receiver._id.toString() === userId.toString() && !message.isRead) {
        conversation.unreadCount++;
      }

      // Update last message if this is more recent
      if (message.createdAt > conversation.lastMessage.createdAt) {
        conversation.lastMessage = message;
      }
    });

    // Convert to array and sort by last message time
    const conversations = Array.from(conversationsMap.values())
      .map(conv => ({
        otherUser: conv.otherUser,
        lastMessage: conv.lastMessage,
        unreadCount: conv.unreadCount,
        messageCount: conv.messages.length
      }))
      .sort((a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt);

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedConversations = conversations.slice(startIndex, endIndex);

    logger.info('Conversations retrieved', {
      userId,
      totalConversations: conversations.length,
      returnedConversations: paginatedConversations.length
    });

    res.status(200).json({
      success: true,
      conversations: paginatedConversations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: conversations.length,
        pages: Math.ceil(conversations.length / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching conversations:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId
    });
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getConversationMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Validate otherUserId
    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }

    const skip = (page - 1) * limit;

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    })
    .populate('sender', 'name email role')
    .populate('receiver', 'name email role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Message.countDocuments({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    });

    // Mark messages as read
    await Message.updateMany(
      { sender: otherUserId, receiver: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    logger.info('Conversation messages retrieved', {
      userId,
      otherUserId,
      count: messages.length,
      total
    });

    res.status(200).json({
      success: true,
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching conversation messages:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      otherUserId: req.params?.otherUserId
    });
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export { sendMessage, getMessages, markMessageAsRead, deleteMessage, getUnreadCount, getConversations, getConversationMessages };
