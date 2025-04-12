const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Register new user
router.post('/register', async (req, res) => {
    console.log('Registration request received:', req.body);
    
    try {
        const { username, email, password } = req.body;

        // Validate input
        if (!username || !email || !password) {
            console.log('Missing required fields');
            return res.status(400).json({ 
                message: 'Please provide all required fields: username, email, and password' 
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log('Invalid email format');
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        // Validate password length
        if (password.length < 6) {
            console.log('Password too short');
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        // Check if user already exists
        console.log('Checking for existing user...');
        let existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            console.log('User already exists:', existingUser.email === email ? 'email taken' : 'username taken');
            if (existingUser.email === email) {
                return res.status(400).json({ message: 'Email is already registered' });
            }
            return res.status(400).json({ message: 'Username is already taken' });
        }

        // Create new user
        console.log('Creating new user...');
        const user = new User({
            username,
            email,
            password
        });

        console.log('Saving user to database...');
        await user.save();
        console.log('User saved successfully');

        // Generate JWT token
        console.log('Generating JWT token...');
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-default-secret-key',
            { expiresIn: '24h' }
        );

        // Send success response
        console.log('Sending success response...');
        res.status(201).json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            },
            message: 'Registration successful'
        });
    } catch (error) {
        console.error('Registration error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        
        // Handle mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            console.log('Validation error:', messages);
            return res.status(400).json({ message: messages.join(', ') });
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
            console.log('Duplicate key error');
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ 
                message: `This ${field} is already registered` 
            });
        }

        console.error('Unhandled registration error:', error);
        res.status(500).json({ 
            message: 'Server error during registration. Please try again.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ 
                message: 'Please provide both email and password' 
            });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-default-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login. Please try again.' });
    }
});

// Get current user
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Server error while fetching user data' });
    }
});

// Verify token
router.get('/verify', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            user: {
                id: user._id,
                username: user.username,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ message: 'Invalid token' });
    }
});

module.exports = router; 