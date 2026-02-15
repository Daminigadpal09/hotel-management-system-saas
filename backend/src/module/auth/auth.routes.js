const express = require("express");
const router = express.Router();
const controller = require("./auth.controller");

router.post("/register-hotel", controller.registerHotel);
router.post("/login", controller.login);

module.exports = router;
