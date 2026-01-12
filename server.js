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
const connectionRoutes = require('./routes/connectionRoutes');

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/uploads', express.static('uploads'));

// Socket.IO Connection Handler
const Message = require('./models/Message');
const Connection = require('./models/Connection');
const User = require('./models/User');

// Socket.IO Connection Handler
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Helper to store phone on socket for disconnect handling
  socket.on("register", (phone) => {
    socket.userPhone = phone; // Store for disconnect
  });

  // Register user with their phone number
  socket.on("register", async (phone) => {
    socket.join(phone);
    console.log(`User registered with phone: ${phone} (Socket ID: ${socket.id})`);

    // Update user status to online
    try {
      await User.findOneAndUpdate({ phone }, { isOnline: true });
      io.emit("user_status_change", { phone, isOnline: true });
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  });

  // Handle connection response
  socket.on('respond_to_request', async ({ to, status, from }) => {
    // from = responder (current user), to = requester
    try {
      const connection = await Connection.findOneAndUpdate(
        { requester: to, recipient: from },
        { status },
        { new: true }
      );

      if (connection) {
        // Notify requester
        io.to(to).emit('request_response', { from, status });
        // Notify responder (to update UI)
        io.to(from).emit('request_response', { from: to, status }); // 'from' here essentially keys the chat
      }
    } catch (error) {
      console.error("Error responding to request:", error);
    }
  });

  // Handle private messages
  socket.on("private_message", async ({ to, message, from }) => {
    console.log(`Message from ${from} to ${to}: ${message}`);

    try {
      // Check Connection Status
      let connection = await Connection.findOne({
        $or: [
          { requester: from, recipient: to },
          { requester: to, recipient: from }
        ]
      });

      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase();

      if (!connection) {
        // First time interaction: Create Pending Connection
        connection = await Connection.create({
          requester: from,
          recipient: to,
          status: 'pending'
        });

        // Save Message
        const newMessage = await Message.create({
          sender: from,
          recipient: to,
          message,
          time,
          status: 'sent'
        });

        // Emit Connection Request to Recipient
        io.to(to).emit("connection_request", {
          _id: newMessage._id,
          from,
          message,
          time,
          status: 'sent',
          connectionId: connection._id
        });

        // Emit Request Sent to Sender (to show "Waiting...")
        io.to(from).emit("request_sent", { to });
        return;
      }

      if (connection.status === 'pending') {
        // If interaction exists but pending
        io.to(from).emit("message_error", { to, error: "Wait for the user to accept your request." });
        return;
      }

      if (connection.status === 'rejected') {
        io.to(from).emit("message_error", { to, error: "You cannot message this user." });
        return;
      }

      // If Accepted, proceed normally
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

  // Typing Indicators
  socket.on("typing", ({ to, from }) => {
    io.to(to).emit("typing", { from });
  });

  socket.on("stop_typing", ({ to, from }) => {
    io.to(to).emit("stop_typing", { from });
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

  socket.on("disconnect", async () => {
    console.log("User disconnected", socket.id);

    // We need to find which user disconnected. 
    // Since we don't store socketId -> user mapping in memory efficiently here,
    // we might need to rely on the fact that 'register' joined a room named `phone`.
    // BUT, socket.rooms is cleared on disconnect.
    // A better approach for this simple app is to store the phone in the socket object on register.

    if (socket.userPhone) {
      const phone = socket.userPhone;
      const lastSeen = new Date();
      try {
        await User.findOneAndUpdate({ phone }, { isOnline: false, lastSeen });
        io.emit("user_status_change", { phone, isOnline: false, lastSeen });
        console.log(`User ${phone} marked offline`);
      } catch (error) {
        console.error("Error marking user offline:", error);
      }
    }
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
