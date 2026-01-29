import express from "express";
import {
  sendMessage,
  getMessages,
  markMessageAsRead,
  deleteMessage,
  getUnreadCount
} from "../controllers/messageController.js";
import { protect } from "../middlewares/authMiddleware.js";

const messageRouter = express.Router();

// All message routes require authentication
messageRouter.use(protect);

messageRouter.post('/send', sendMessage);
messageRouter.get('/', getMessages);
messageRouter.put('/:messageId/read', markMessageAsRead);
messageRouter.delete('/:messageId', deleteMessage);
messageRouter.get('/unread/count', getUnreadCount);

export default messageRouter;