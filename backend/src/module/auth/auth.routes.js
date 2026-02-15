const express = require("express");
const router = express.Router();
console.log("Loading auth controller...");
const controller = require("./auth.controller");
console.log("Auth controller loaded:", Object.keys(controller));

router.post("/register-hotel", (req, res) => {
    console.log("Register hotel route hit");
    controller.registerHotel(req, res);
});
router.post("/register", (req, res) => {
    console.log("Register route hit");
    controller.registerHotel(req, res);
});
router.post("/login", (req, res) => {
    console.log("Login route hit");
    controller.login(req, res);
});

module.exports = router;
