import User from "../model/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";


// 🔐 Generate JWT
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      hotelId: user.hotelId,   // 🔥 needed for tenant filter
      branchId: user.branchId
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};



// ✅ REGISTER USER
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, hotel_id, branch_id } = req.body;

    // 🔍 Check if email already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered"
      });
    }

    // ✅ Create user (password will be hashed automatically by pre-save hook)
    const user = await User.create({
      name,
      email,
      password, // Plain password - model will hash it
      role,
      ...(hotel_id && { hotel_id }),
      ...(branch_id && { branch_id })
    });

    // 🔐 Generate token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hotel_id: user.hotel_id,
        branch_id: user.branch_id
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};



// ✅ LOGIN USER
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 🔍 Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found"
      });
    }

    // 🚫 Check account status
    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Account is inactive"
      });
    }

    // 🔐 Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hotel_id: user.hotel_id,
        branch_id: user.branch_id
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
