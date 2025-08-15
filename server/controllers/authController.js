// server/controllers/authController.js - Fixed implementation
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper to ensure only BRACU G-Suite emails are used
const isBracuEmail = (email) => /^[^@\s]+@(?:g\.)?bracu\.ac\.bd$/i.test(email);

/**
 * Register a new user
 * Compatible with both signup APIs from the original projects
 */
const registerUser = async (req, res) => {
    try {
        const { name, email, password, gender, location, phone, bracuId } = req.body;

        // Validate required fields
        if (!name || !email || !password || !phone || !bracuId) {
            return res.status(400).json({ 
                error: "Name, email, password, phone and BRACU ID are required",
                message: "Missing required fields" 
            });
        }

        // Enforce BRACU email domain
        if (!isBracuEmail(email)) {
            return res.status(400).json({
                error: "A BRACU G-Suite email is required",
                message: "Only BRACU emails are allowed"
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                error: "User with this email already exists",
                message: "User already exists"
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Validate Bangladeshi phone: +880 followed by 10 digits
        const bdPhoneRegex = /^\+880\d{10}$/;
        if (!bdPhoneRegex.test(phone)) {
            return res.status(400).json({
                error: "Phone must be in Bangladeshi format +880XXXXXXXXXX (10 digits)",
                message: "Invalid phone number format"
            });
        }

        // Ensure unique BRACU ID
        const existingId = await User.findOne({ bracuId });
        if (existingId) {
            return res.status(400).json({ error: 'BRACU ID already exists' });
        }

        // Create new user
        const user = new User({
            email,
            password: hashedPassword,
            name,
            gender,
            location,
            phone,
            bracuId,
            preferences: {
                darkMode: false
            }
        });

        await user.save();

        // Return success response
        res.status(201).json({ 
            message: "User registered successfully",
            success: true 
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ 
            error: err.message || "Server error during registration",
            message: "Registration failed" 
        });
    }
};

/**
 * Login user
 * Returns JWT token and user data
 */
const loginUser = async (req, res) => {
    try {
        const { email, password, bracuId } = req.body;

        // Validate input (allow either email or BRACU ID)
        if ((!email && !bracuId) || !password) {
            return res.status(400).json({ 
                error: "Email/BRACU ID and password are required",
                message: "Missing credentials" 
            });
        }

        // Find user by email or BRACU ID
        const user = email 
            ? await User.findOne({ email })
            : await User.findOne({ bracuId });
        if (!user) {
            return res.status(404).json({
                error: "User not found",
                message: "Invalid credentials"
            });
        }

        // Ensure user is using BRACU email when logging in via email
        if (email && !isBracuEmail(user.email)) {
            return res.status(401).json({
                error: "Only BRACU emails are allowed",
                message: "Only BRACU emails are allowed"
            });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                error: "Invalid credentials",
                message: "Invalid credentials"
            });
        }

        // Create token - support both naming conventions for secret
        const secret = process.env.JWT_SECRET || process.env.SECRET_KEY;
        if (!secret) {
            console.error('JWT Secret key is missing in environment variables!');
            return res.status(500).json({
                error: "Server configuration error",
                message: "Server configuration error"
            });
        }

        const token = jwt.sign(
            { 
                id: user._id,          // Sathi_Lagbe format
                userId: user._id,       // ONLYGWUB format
                email: user.email,
                bracuId: user.bracuId 
            },
            secret,
            { expiresIn: '3d' }
        );

        // Create user object without password
        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            gender: user.gender,
            location: user.location,
            phone: user.phone,
            bracuId: user.bracuId,
            preferences: user.preferences,
            avatarUrl: user.avatarUrl || ''
        };

        // Return token and user data
        res.json({
            token,
            user: userResponse,
            userId: user._id.toString(), // Add explicit userId field
            message: "Login successful",
            success: true
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ 
            error: err.message || "Server error during login",
            message: "Login failed" 
        });
    }
};

/**
 * Verify user token
 * Used for token validation and refreshing user data
 */
const verifyToken = async (req, res) => {
    try {
        // req.user already set by auth middleware
        const userId = req.user.id || req.user.userId;
        
        if (!userId) {
            return res.status(401).json({
                error: "Invalid token format",
                message: "Invalid token format",
                valid: false
            });
        }

        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                error: "User not found",
                message: "User not found",
                valid: false
            });
        }

        // Return user data without password
        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            gender: user.gender,
            location: user.location,
            phone: user.phone,
            bracuId: user.bracuId || '',
            preferences: user.preferences,
            avatarUrl: user.avatarUrl || ''
        };

        res.json({
            user: userResponse,
            valid: true,
            message: "Token is valid"
        });
    } catch (err) {
        console.error('Token verification error:', err);
        res.status(401).json({
            error: err.message || "Invalid token",
            message: "Token verification failed",
            valid: false
        });
    }
};

/**
 * Logout user - client should discard token
 */
const logoutUser = async (req, res) => {
    try {
        const email = req.user.email;
        if (!isBracuEmail(email)) {
            return res.status(401).json({
                error: "Only BRACU emails are allowed",
                message: "Only BRACU emails are allowed"
            });
        }

        // No server-side token invalidation for now
        res.json({
            message: "Logout successful",
            success: true
        });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({
            error: err.message || "Server error during logout",
            message: "Logout failed"
        });
    }
};

/**
 * Delete user account
 */
const deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                error: "User not found",
                message: "User not found"
            });
        }

        if (!isBracuEmail(user.email)) {
            return res.status(401).json({
                error: "Only BRACU emails are allowed",
                message: "Only BRACU emails are allowed"
            });
        }

        await User.findByIdAndDelete(userId);

        res.json({
            message: "Account deleted successfully",
            success: true
        });
    } catch (err) {
        console.error('Account deletion error:', err);
        res.status(500).json({
            error: err.message || "Server error during account deletion",
            message: "Account deletion failed"
        });
    }
};

// Export all functions for routing
module.exports = {
    registerUser,
    loginUser,
    verifyToken,
    logoutUser,
    deleteAccount
};