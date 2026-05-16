const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const { protect, admin } = require('../middleware/auth');

router.use(protect, admin);

// ─── DASHBOARD ────────────────────────────────────
// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [totalOrders, totalUsers, totalProducts, revenueData, recentOrders, ordersByStatus] =
      await Promise.all([
        Order.countDocuments(),
        User.countDocuments({ isAdmin: false }),
        Product.countDocuments({ isActive: true }),
        Order.aggregate([
          { $match: { status: { $ne: 'cancelled' } } },
          { $group: { _id: null, revenue: { $sum: '$total' }, avg: { $avg: '$total' } } },
        ]),
        Order.find().sort({ createdAt: -1 }).limit(5).populate('user', 'name email'),
        Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      ]);

    const revenue = revenueData[0] || { revenue: 0, avg: 0 };
    res.json({
      success: true,
      stats: {
        totalOrders,
        totalUsers,
        totalProducts,
        totalRevenue: Math.round(revenue.revenue),
        avgOrderValue: Math.round(revenue.avg),
        recentOrders,
        ordersByStatus,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PRODUCTS ─────────────────────────────────────
// GET /api/admin/products
router.get('/products', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = {};
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { category: { $regex: search, $options: 'i' } }];
    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ success: true, total, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/products
router.post('/products', async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/products/:id
router.put('/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/products/:id (soft delete)
router.delete('/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Product deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── ORDERS ───────────────────────────────────────
// GET /api/admin/orders
router.get('/orders', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) query.orderNumber = { $regex: search, $options: 'i' };

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ success: true, total, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/orders/:id
router.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email phone');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/orders/:id
router.put('/orders/:id', async (req, res) => {
  try {
    const { status, trackingNumber, note, cancelReason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (status) {
      order.status = status;
      order.statusHistory.push({ status, note: note || `Status updated to ${status}` });
      if (status === 'delivered') order.deliveredAt = Date.now();
      if (status === 'cancelled' && cancelReason) order.cancelReason = cancelReason;
    }
    if (trackingNumber) order.trackingNumber = trackingNumber;

    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── USERS ────────────────────────────────────────
// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = { isAdmin: false };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const total = await User.countDocuments(query);
    const users = await User.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
    res.json({ success: true, total, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PROMO CODES ─────────────────────────────────────────────────────────
const Promo = require('../models/Promo');

// GET /api/admin/promos
router.get('/promos', async (req, res) => {
  try {
    const promos = await Promo.find().sort({ createdAt: -1 });
    res.json({ success: true, promos });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/admin/promos
router.post('/promos', async (req, res) => {
  try {
    const { code, discountPct, maxUses } = req.body;
    if (!code || !discountPct)
      return res.status(400).json({ success: false, message: 'Code and discountPct required' });
    const promo = await Promo.create({ code, discountPct, maxUses: maxUses || null });
    res.status(201).json({ success: true, promo });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ success: false, message: 'Promo code already exists' });
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/promos/:id
router.delete('/promos/:id', async (req, res) => {
  try {
    await Promo.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Promo deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT /api/admin/promos/:id — toggle active / edit
router.put('/promos/:id', async (req, res) => {
  try {
    const promo = await Promo.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!promo) return res.status(404).json({ success: false, message: 'Promo not found' });
    res.json({ success: true, promo });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

module.exports = router;
