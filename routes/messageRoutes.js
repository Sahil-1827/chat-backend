const express = require('express');
const { getMessages, clearMessages } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/:contactPhone', protect, getMessages);
router.post('/clear/:contactPhone', protect, clearMessages);

module.exports = router;
