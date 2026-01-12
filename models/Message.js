const mongoose = require('mongoose');

const messageSchema = mongoose.Schema({
    sender: {
        type: String,
        required: true,
        ref: 'User' // Although we store phone, this is logical ref
    },
    recipient: {
        type: String,
        required: true,
        ref: 'User'
    },
    message: {
        type: String,
        required: true
    },
    time: {
        type: String, // formatted time string e.g. "10:00 am"
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);
