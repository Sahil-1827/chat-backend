const Connection = require('../models/Connection');
const Message = require('../models/Message');

const getConnectionStatus = async (req, res) => {
    try {
        const myPhone = req.user.phone;
        const otherPhone = req.params.phone;

        const connection = await Connection.findOne({
            $or: [
                { requester: myPhone, recipient: otherPhone },
                { requester: otherPhone, recipient: myPhone }
            ]
        });

        if (!connection) {
            return res.json({ status: 'none', isRequester: false });
        }

        const isRequester = connection.requester === myPhone;
        res.json({
            status: connection.status,
            isRequester,
            blockedBy: connection.blockedBy
        });

    } catch (error) {
        console.error("Get connection status error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const deleteConnection = async (req, res) => {
    try {
        const myPhone = req.user.phone;
        const otherPhone = req.params.phone;

        // Delete Connection
        await Connection.findOneAndDelete({
            $or: [
                { requester: myPhone, recipient: otherPhone },
                { requester: otherPhone, recipient: myPhone }
            ]
        });

        // Delete Messages
        await Message.deleteMany({
            $or: [
                { sender: myPhone, recipient: otherPhone },
                { sender: otherPhone, recipient: myPhone }
            ]
        });

        res.json({ message: "Chat deleted successfully" });
    } catch (error) {
        console.error("Delete connection error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { getConnectionStatus, deleteConnection };
