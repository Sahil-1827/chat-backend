const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();

const app = express();
const server = http.createServer(app);

// Configure options with polling as preferred transport
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL, // Specific origin for credentials
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['polling', 'websocket'] // Prioritize polling slightly or allow it explicitly
});

app.use(cors({
  origin: process.env.FRONTEND_URL, // Specific origin for credentials
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/messageRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use('/uploads', express.static('uploads'));

// Socket.IO Connection Handler
const Message = require('./models/Message');

// Socket.IO Connection Handler
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Register user with their phone number
  socket.on("register", (phone) => {
    socket.join(phone);
    console.log(`User registered with phone: ${phone} (Socket ID: ${socket.id})`);
  });

  // Handle private messages
  socket.on("private_message", async ({ to, message, from }) => {
    console.log(`Message from ${from} to ${to}: ${message}`);

    try {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase();

      // Save to Database
      const newMessage = await Message.create({
        sender: from,
        recipient: to,
        message,
        time,
        status: 'sent'
      });

      // Send to the recipient's room (phone number)
      io.to(to).emit("receive_message", {
        _id: newMessage._id,
        from,
        message,
        time,
        status: 'sent'
      });
    } catch (error) {
      console.error("Error saving message:", error);
    }
  });

  socket.on('mark_as_read', async (data) => {
    // data: { to: 'senderPhone', from: 'readerPhone' }
    console.log(`Messages read by ${data.from} for ${data.to}`);

    try {
      // Update all unread messages from 'to' (sender) sent to 'from' (reader)
      await Message.updateMany(
        { sender: data.to, recipient: data.from, status: { $ne: 'read' } },
        { $set: { status: 'read' } }
      );

      io.to(data.to).emit('messages_read', { from: data.from });
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
  });
});

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.error("MongoDB connection error:", err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
