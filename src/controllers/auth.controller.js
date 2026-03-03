import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js"; 

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// Register
export const register = async (req, res) => {
  try {
    const { email, password, name, academicYear, academicLevel } = req.body; // ✅ Added academic fields

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and profile
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        academicYear, // ✅ e.g "3rd Year BSIT"
        academicLevel, // ✅ e.g "College Junior"
        path: "NONE", // ✅ Default path from schema
        isPremium: false, // ✅ Default from schema
        currentStage: 1, // ✅ Default from schema
        profile: {
          create: {
            level: 1, // ✅ Default RPG stats
            xp: 0,
            hp: 100,
            maxHp: 100,
            badge: "WARRIOR",
          },
        },
      },
      include: {
        profile: true,
      },
    });

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
    );

    // Set cookie
    res.cookie("access_token", token, cookieOptions);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return res.status(201).json({
      message: "User registered successfully",
      user: userWithoutPassword,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
    );

    // Set cookie
    res.cookie("access_token", token, cookieOptions);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return res.status(200).json({
      message: "Login successful",
      user: userWithoutPassword,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// Logout
export const logout = async (req, res) => {
  try {
    res.clearCookie("access_token", cookieOptions);
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// Get current user
export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { profile: true }, // ✅ Include RPG profile
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return res.status(200).json({ user: userWithoutPassword });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
