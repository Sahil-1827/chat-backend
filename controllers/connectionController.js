const Connection = require('../models/Connection');

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
            isRequester
        });

    } catch (error) {
        console.error("Get connection status error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { getConnectionStatus };
