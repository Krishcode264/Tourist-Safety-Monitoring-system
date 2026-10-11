const express = require("express");
const { chat } = require("../controllers/chatController.js");

const router = express.Router();

router.post("/", chat);

module.exports = router;