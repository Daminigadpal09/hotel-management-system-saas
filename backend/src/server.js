// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const connectDB = require("./config/db");

// const authRoutes = require("./modules/auth/auth.routes");

// const app = express();

// connectDB();

// app.use(cors());
// app.use(express.json());

// app.use("/api/auth", authRoutes);

// app.get("/", (req, res) => {
//   res.send("Hotel SaaS Backend Running 🚀");
// });

// const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

require("dotenv").config();
const express=require("express");
const cors=require("cors");
const connectDB=require("./config/db");

console.log("Loading auth routes...");
const authRoutes = require("./module/auth/auth.routes");
console.log("Auth routes loaded");

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

console.log("Registering auth routes...");
app.use("/api/auth", authRoutes);
console.log("Auth routes registered at /api/auth");

// Add a simple test route
app.post("/test", (req, res) => {
    console.log("Test route hit");
    res.json({ message: "Test route working" });
});

app.get("/", (req, res) => {
  res.send("Hotel SaaS Backend Running 🚀");
});

// Add a catch-all route to debug
app.use((req, res, next) => {
    console.log(`Request received: ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    res.status(404).json({ 
        message: 'Route not found',
        method: req.method,
        url: req.url,
        availableRoutes: [
            'GET /',
            'POST /test',
            'POST /api/auth/register-hotel',
            'POST /api/auth/register', 
            'POST /api/auth/login'
        ]
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
