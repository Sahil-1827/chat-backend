const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
        },
        about: {
            type: String,
            default: "Hey there! I am using WhatsApp.",
        },
        profilePic: {
            type: String,
            default: "",
        },
        isOnline: {
            type: Boolean,
            default: false,
        },
        lastSeen: {
            type: Date,
            default: Date.now,
        }
    },
    { timestamps: true }
);

// Encrypt password before saving
// userSchema.pre("save", async function (next) {
//     if (!this.isModified("password")) {
//         return next();
//     }
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
// });

userSchema.methods.matchPassword = async function (enteredPassword) {
    // return await bcrypt.compare(enteredPassword, this.password);
    return enteredPassword === this.password;
};

module.exports = mongoose.model("User", userSchema);
