const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
    });
};

const signup = async (req, res) => {
    const { name, phone, password } = req.body;

    if (!name || !phone || !password) {
        return res.status(400).json({ message: "Please add all fields" });
    }

    const userExists = await User.findOne({ phone });

    if (userExists) {
        return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
        name,
        phone,
        password,
    });

    if (user) {
        res.status(201).json({
            _id: user.id,
            name: user.name,
            phone: user.phone,
            token: generateToken(user.id),
        });
    } else {
        res.status(400).json({ message: "Invalid user data" });
    }
};

const login = async (req, res) => {
    const { phone, password } = req.body;

    const user = await User.findOne({ phone });

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user.id,
            name: user.name,
            phone: user.phone,
            token: generateToken(user.id),
        });
    } else {
        res.status(400).json({ message: "Invalid credentials" });
    }
};

const verifyPhone = async (req, res) => {
    const { phone } = req.body;

    const user = await User.findOne({ phone });

    if (user) {
        res.status(200).json({ message: "User found", phone: user.phone });
    } else {
        res.status(404).json({ message: "User not found with this phone number" });
    }
};

const resetPassword = async (req, res) => {
    const { phone, newPassword } = req.body;

    const user = await User.findOne({ phone });

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    if (await user.matchPassword(newPassword)) {
        return res.status(400).json({ message: "New password cannot be the same as old password" });
    }

    // const salt = await bcrypt.genSalt(10);
    // user.password = await bcrypt.hash(newPassword, salt);
    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
};

const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user) {
            res.json({
                _id: user.id,
                name: user.name,
                phone: user.phone,
                about: user.about,
                profilePic: user.profilePic,
            });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { name, about } = req.body;
        const userId = req.user.id; // From middleware/token

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (name) user.name = name;
        if (about) user.about = about;

        if (req.body.removeProfilePic === 'true' || req.body.removeProfilePic === true) {
            user.profilePic = "";
        }

        if (req.file) {
            // Cloudinary returns the full secure URL in path
            user.profilePic = req.file.path;
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            phone: updatedUser.phone,
            about: updatedUser.about,
            profilePic: updatedUser.profilePic,
            token: generateToken(updatedUser._id), // Optional: refresh token
        });

    } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.user.id } }).select("-password");
        const myPhone = req.user.phone;
        const Message = require('../models/Message'); // Import here to avoid circular dependency issues if any

        // Enhance users with last message and unread count
        const usersWithStats = await Promise.all(users.map(async (user) => {
            const userObj = user.toObject();

            // Find last message
            const lastMsg = await Message.findOne({
                $or: [
                    { sender: myPhone, recipient: user.phone },
                    { sender: user.phone, recipient: myPhone }
                ]
            }).sort({ createdAt: -1 });

            // Count unread messages from this user
            const unreadCount = await Message.countDocuments({
                sender: user.phone,
                recipient: myPhone,
                status: { $ne: 'read' }
            });

            userObj.lastMessage = lastMsg ? {
                text: lastMsg.message,
                time: lastMsg.time,
                timestamp: lastMsg.createdAt
            } : null;

            userObj.unreadCount = unreadCount;

            return userObj;
        }));

        // Optional: Sort by last message timestamp (most recent first)
        usersWithStats.sort((a, b) => {
            const timeA = a.lastMessage ? new Date(a.lastMessage.timestamp) : 0;
            const timeB = b.lastMessage ? new Date(b.lastMessage.timestamp) : 0;
            return timeB - timeA;
        });

        res.json(usersWithStats);
    } catch (error) {
        console.error("Get all users error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    signup,
    login,
    verifyPhone,
    resetPassword,
    updateProfile,
    getProfile,
    getAllUsers
};
