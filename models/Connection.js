const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema({
    requester: { type: String, required: true }, // Phone number
    recipient: { type: String, required: true }, // Phone number
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    },
    blockedBy: { type: String, default: null } // Phone number of user who blocked
}, { timestamps: true });

// Index for quicker lookups of the pair
connectionSchema.index({ requester: 1, recipient: 1 });

module.exports = mongoose.model('Connection', connectionSchema);
