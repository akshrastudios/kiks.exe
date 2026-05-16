const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Cart = require('../models/Cart');
const { protect } = require('../middleware/auth');

const signToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set in your .env file. See README → Environment Variables.');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists)
      return res.status(400).json({ success: false, message: 'Email already registered' });

    const user = await User.create({ name, email, password, phone });

    // Merge guest cart if provided
    const { guestCart } = req.body;
    if (guestCart && guestCart.length > 0) {
      await Cart.create({ user: user._id, items: guestCart });
    }

    res.status(201).json({
      success: true,
      token: signToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    // Merge guest cart on login
    const { guestCart } = req.body;
    if (guestCart && guestCart.length > 0) {
      let cart = await Cart.findOne({ user: user._id });
      if (!cart) cart = new Cart({ user: user._id, items: [] });
      for (const gi of guestCart) {
        const key = `${gi.product}_${gi.size}`;
        const existing = cart.items.find(i => `${i.product}_${i.size}` === key);
        if (existing) existing.qty = Math.min(10, existing.qty + gi.qty);
        else cart.items.push(gi);
      }
      await cart.save();
    }

    res.json({
      success: true,
      token: signToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, password, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (name) user.name = name;
    if (phone) user.phone = phone;

    if (newPassword) {
      if (!password)
        return res.status(400).json({ success: false, message: 'Current password required' });
      const match = await user.matchPassword(password);
      if (!match)
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      if (newPassword.length < 6)
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
      user.password = newPassword;
    }

    await user.save();
    res.json({
      success: true,
      message: 'Profile updated',
      user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, isAdmin: user.isAdmin },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/auth/address
router.put('/address', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const addr = req.body;
    if (addr._id) {
      const idx = user.addresses.findIndex(a => a._id.toString() === addr._id);
      if (idx > -1) user.addresses[idx] = { ...user.addresses[idx].toObject(), ...addr };
    } else {
      if (addr.isDefault) user.addresses.forEach(a => (a.isDefault = false));
      user.addresses.push(addr);
    }
    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
