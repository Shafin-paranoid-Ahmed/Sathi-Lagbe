// server/controllers/authController.js
const User = require('../models/User');
const Routine = require('../models/Routine');
const bcrypt = require('bcryptjs');
const { signToken } = require('../utils/jwt');
const { isValidBangladeshPhone } = require('../utils/validators');

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
                success: false,
                error: "Name, email, password, phone and BRACU ID are required",
                message: "Missing required fields" 
            });
        }

        // Enforce BRACU email domain
        if (!isBracuEmail(email)) {
            return res.status(400).json({
                success: false,
                error: "A BRACU G-Suite email is required",
                message: "Only BRACU emails are allowed"
            });
        }

        // Password strength (aligned with tests: weak passwords rejected with password-related error)
        if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
            return res.status(400).json({
                success: false,
                error: 'password must be at least 8 characters and include both letters and numbers',
                message: 'Weak password'
            });
        }

        const bracuIdNorm = String(bracuId).trim();
        if (!/^\d{8}$/.test(bracuIdNorm)) {
            return res.status(400).json({
                success: false,
                error: 'bracuId must be exactly 8 digits',
                message: 'Invalid bracuId'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: "User with this email already exists",
                message: "User already exists"
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Validate Bangladeshi phone: +880 followed by 10 digits
        if (!isValidBangladeshPhone(phone)) {
            return res.status(400).json({
                success: false,
                error: "Phone must be in Bangladeshi format +880XXXXXXXXXX (10 digits)",
                message: "Invalid phone number format"
            });
        }

        // Ensure unique BRACU ID
        const existingId = await User.findOne({ bracuId: bracuIdNorm });
        if (existingId) {
            return res.status(400).json({ 
                success: false,
                error: 'BRACU ID already exists' 
            });
        }

        // Create new user
        const user = new User({
            email,
            password: hashedPassword,
            name,
            gender,
            location,
            phone,
            bracuId: bracuIdNorm,
            preferences: {
                darkMode: false
            }
        });

        await user.save();

        // Generate JWT token. Same payload shape as login so downstream
        // middleware/controllers see a consistent req.user.
        const token = signToken(
            {
                userId: user._id,
                id: user._id,
                email: user.email,
                bracuId: user.bracuId
            },
            { expiresIn: '7d' }
        );

        // Return success response
        res.status(201).json({ 
            message: "User registered successfully",
            success: true,
            token: token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                bracuId: user.bracuId,
                phone: user.phone,
                gender: user.gender
            }
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ 
            success: false,
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
                success: false,
                error: "Email/BRACU ID and password are required",
                message: "Missing credentials" 
            });
        }

        // Find user by email or BRACU ID
        const user = email 
            ? await User.findOne({ email })
            : await User.findOne({ bracuId });
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
                message: 'Invalid credentials'
            });
        }

        // Ensure user is using BRACU email when logging in via email
        if (email && !isBracuEmail(user.email)) {
            return res.status(401).json({
                success: false,
                error: "Only BRACU emails are allowed",
                message: "Only BRACU emails are allowed"
            });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: "Invalid credentials",
                message: "Invalid credentials"
            });
        }

        const token = signToken(
            {
                id: user._id,
                userId: user._id,
                email: user.email,
                bracuId: user.bracuId
            },
            { expiresIn: '7d' }
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
            avatarUrl: user.avatarUrl || '',
            routineSharingEnabled: user.routineSharingEnabled
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
            success: false,
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
                success: false,
                error: "Invalid token format",
                message: "Invalid token format",
                valid: false
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(401).json({
                success: false,
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
            avatarUrl: user.avatarUrl || '',
            routineSharingEnabled: user.routineSharingEnabled
        };

        res.json({
            success: true,
            user: userResponse,
            valid: true,
            message: "Token is valid"
        });
    } catch (err) {
        console.error('Token verification error:', err);
        res.status(401).json({
            success: false,
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
        // No server-side token invalidation; do not require email on JWT
        // (test tokens may only carry userId).
        res.json({
            success: true,
            message: "You have been logged out successfully"
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

        // Delete user's routine entries
        await Routine.deleteMany({ userId });
        
        // Delete user account
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