const express = require('express');
const router = express.Router();
const { getConnectionStatus } = require('../controllers/connectionController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:phone', protect, getConnectionStatus);

module.exports = router;
