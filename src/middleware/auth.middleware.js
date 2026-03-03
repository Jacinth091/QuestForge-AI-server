import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

export const protect = async (req, res, next) => {
  try {
    // Get token from cookie
    const token = req.cookies?.access_token;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized. Please login." });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        path: true,
        isPremium: true,
        currentStage: true,
      },
    });

    if (!user) {
      return res
        .status(401)
        .json({ message: "User not found. Please login again." });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Invalid or expired token. Please login again." });
  }
};
