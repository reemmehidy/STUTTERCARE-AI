import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { config } from "../config.js";

export const makeToken = (id) => jwt.sign({ id }, config.jwtSecret, { expiresIn: "7d" });

// Requires a valid login token.
export const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
  try {
    const decoded = jwt.verify(header.split(" ")[1], config.jwtSecret);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "User not found" });
    if (!user.emailVerified) return res.status(403).json({ message: "Email not verified", code: "EMAIL_NOT_VERIFIED" });
    // A password change/reset invalidates every older token.
    if (user.passwordChangedAt && decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
      return res.status(401).json({ message: "Session expired, please log in again" });
    }
    // Remember activity (at most once an hour) so the admin can see who is active.
    if (!user.lastSeenAt || Date.now() - user.lastSeenAt.getTime() > 3600_000) {
      User.updateOne({ _id: user._id }, { lastSeenAt: new Date() }).catch(() => {});
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const isPremium = (u) => u.plan === "premium" && (!u.premiumUntil || u.premiumUntil > new Date());

// Requires an active premium plan (admins always pass).
export const requirePremium = (req, res, next) =>
  req.user.role === "admin" || isPremium(req.user)
    ? next()
    : res.status(402).json({ code: "PREMIUM_REQUIRED", message: "This feature is part of the Premium plan." });

// Requires one of the given roles.
export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden: insufficient role" });
  }
  next();
};
