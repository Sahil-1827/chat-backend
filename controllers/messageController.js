const Message = require('../models/Message');

const getMessages = async (req, res) => {
    try {
        const { contactPhone } = req.params;
        const myPhone = req.user.phone;

        const messages = await Message.find({
            $or: [
                { sender: myPhone, recipient: contactPhone },
                { sender: contactPhone, recipient: myPhone }
            ]
        }).sort({ createdAt: 1 });

        res.json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { getMessages };
