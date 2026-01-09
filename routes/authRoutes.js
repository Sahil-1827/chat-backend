const express = require("express");
const router = express.Router();
const { signup, login, verifyPhone, resetPassword } = require("../controllers/authController");

router.post("/signup", signup);
router.post("/login", login);
router.post("/verify-phone", verifyPhone);
router.post("/reset-password", resetPassword);

module.exports = router;
