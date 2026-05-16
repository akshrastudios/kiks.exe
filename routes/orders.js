const express = require('express');
const router  = express.Router();
const Order   = require('../models/Order');
const Cart    = require('../models/Cart');
const Product = require('../models/Product');
const Promo   = require('../models/Promo');
const { protect } = require('../middleware/auth');

// POST /api/orders — place order
router.post('/', protect, async (req, res) => {
  try {
    const { shippingAddress, paymentMethod, paymentInfo, promoCode, notes } = req.body;

    if (!shippingAddress || !paymentMethod)
      return res.status(400).json({ success: false, message: 'Shipping address and payment method required' });

    // Get cart from DB
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart || cart.items.length === 0)
      return res.status(400).json({ success: false, message: 'Cart is empty' });

    // Validate stock
    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      if (!product || product.stock < item.qty)
        return res.status(400).json({ success: false, message: `${item.name} is out of stock` });
    }

    const subtotal = cart.items.reduce((s, i) => s + i.price * i.qty, 0);

    // Enforce COD limit
    if (paymentMethod === 'COD' && subtotal > 5000)
      return res.status(400).json({ success: false, message: 'Cash on Delivery is only available on orders up to ₹5,000. Please choose UPI or Card.' });
    const shippingCharge = subtotal >= 5000 ? 0 : 99;

    // Validate promo code from MongoDB
    let discount = 0;
    let validPromo = null;
    if (promoCode) {
      validPromo = await Promo.findOne({ code: promoCode.toUpperCase(), isActive: true });
      if (validPromo) {
        if (validPromo.maxUses === null || validPromo.uses < validPromo.maxUses) {
          discount = Math.round(subtotal * (validPromo.discountPct / 100));
        }
      }
    }
    const total = subtotal - discount + shippingCharge;

    const order = await Order.create({
      user: req.user._id,
      items: cart.items.map(i => ({
        product: i.product,
        name: i.name,
        price: i.price,
        art: i.art,
        imageUrl: i.imageUrl || '',
        category: i.category,
        size: i.size,
        qty: i.qty,
      })),
      shippingAddress,
      paymentMethod,
      paymentInfo,
      subtotal,
      shippingCharge,
      discount,
      promoCode: discount > 0 ? promoCode.toUpperCase() : undefined,
      total,
      notes,
    });

    // Reduce stock
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.qty } });
    }

    // Increment promo usage counter
    if (validPromo) {
      await Promo.findByIdAndUpdate(validPromo._id, { $inc: { uses: 1 } });
    }

    // Clear cart
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });

    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/orders — current user's orders
router.get('/', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/orders/:id — single order (user's own)
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;