const User = require('../models/User');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { generateUserId } = require('../utils/idGenerator');

// ─── Register ─────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role, location, company } = req.body;

    if (!name || !email || !phone || !password || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    if (normalizedEmail.includes('demo') || normalizedEmail.includes('test') || name.toLowerCase().includes('demo') || name.toLowerCase().includes('test')) {
      return res.status(400).json({ message: 'Demo/Test accounts are not allowed in production.' });
    }

    // Check for existing user (app-level guard)
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'This email is already registered. Please use a different email or login.' });
    }

    const userId = await generateUserId(role);
    const user = new User({ name, email: normalizedEmail, phone, password, role, location, company, userId });
    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    // Catch MongoDB unique constraint violation (database-level guard)
    if (error.code === 11000) {
      return res.status(400).json({ message: 'This email is already registered. Please use a different email or login.' });
    }
    console.error('[AUTH] Register error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    // Guard: ensure MongoDB is ready before attempting queries
    if (mongoose.connection.readyState !== 1) {
      console.error('[AUTH] Login attempted but MongoDB is not connected (readyState:', mongoose.connection.readyState, ')');
      return res.status(503).json({ message: 'Database connection not ready. Please try again shortly.' });
    }

    const { email, password } = req.body;

    // Validate input fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      console.warn(`[AUTH] Login failed — User not found: ${email}`);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Verify password with bcrypt
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.warn(`[AUTH] Login failed — Password mismatch for: ${email}`);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Sign JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`[AUTH] Login successful — ${user.email} (${user.role})`);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        location: user.location,
        totalIncome: user.totalIncome,
        completedOrders: user.completedOrders,
      },
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error.message);
    res.status(500).json({ message: 'Internal server error during login' });
  }
};

// ─── Get Current User ─────────────────────────────────────────────────────────
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      user: {
        id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        location: user.location,
        company: user.company,
      },
    });
  } catch (error) {
    console.error('[AUTH] getUser error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// ─── Get User Profile ─────────────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      profile: {
        id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        location: user.location,
        company: user.company,
        registrationDate: user.registrationDate,
        profileImage: user.profileImage,
        totalIncome: user.totalIncome,
        walletBalance: user.walletBalance,
        completedOrders: user.completedOrders,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error('[AUTH] getProfile error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// ─── Update User Profile ─────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, location, company } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: 'Name and phone are required' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { name, phone, location, company },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      profile: {
        id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        location: user.location,
        company: user.company,
      },
    });
  } catch (error) {
    console.error('[AUTH] updateProfile error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// ─── Change Password ──────────────────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All password fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('[AUTH] changePassword error:', error.message);
    res.status(500).json({ message: error.message });
  }
};
