const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: "30d",
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

module.exports = {
    signup,
    login,
    verifyPhone,
    resetPassword,
    updateProfile,
    getProfile
};
