const express = require('express');
const router = express.Router();
const { getConnectionStatus, deleteConnection } = require('../controllers/connectionController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:phone', protect, getConnectionStatus);
router.delete('/:phone', protect, deleteConnection);

module.exports = router;
