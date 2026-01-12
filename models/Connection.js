const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema({
    requester: { type: String, required: true }, // Phone number
    recipient: { type: String, required: true }, // Phone number
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    }
}, { timestamps: true });

// Index for quicker lookups of the pair
connectionSchema.index({ requester: 1, recipient: 1 });

module.exports = mongoose.model('Connection', connectionSchema);
