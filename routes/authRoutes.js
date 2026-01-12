const express = require("express");
const router = express.Router();
const { signup, login, verifyPhone, resetPassword, updateProfile, getProfile } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.post("/signup", signup);
router.post("/login", login);
router.post("/verify-phone", verifyPhone);
router.post("/reset-password", resetPassword);
router.put("/profile", protect, upload.single('profilePic'), updateProfile);
router.get("/profile", protect, getProfile);

module.exports = router;
