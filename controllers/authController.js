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

module.exports = {
    signup,
    login,
    verifyPhone,
    resetPassword
};
