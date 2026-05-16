const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

// All cart routes require auth
router.use(protect);

const getOrCreate = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = new Cart({ user: userId, items: [] });
  return cart;
};

// GET /api/cart
router.get('/', async (req, res) => {
  try {
    const cart = await getOrCreate(req.user._id);

    // For items missing imageUrl (added before schema update),
    // fetch it from the Product in one batched query
    const missingImageIds = cart.items
      .filter(i => !i.imageUrl)
      .map(i => i.product);

    let imageMap = {};
    if (missingImageIds.length > 0) {
      const products = await Product.find(
        { _id: { $in: missingImageIds } },
        'imageUrl'
      );
      products.forEach(p => { imageMap[p._id.toString()] = p.imageUrl; });
    }

    const items = cart.items.map(i => {
      const obj = i.toObject();
      if (!obj.imageUrl && imageMap[i.product.toString()]) {
        obj.imageUrl = imageMap[i.product.toString()];
      }
      return obj;
    });

    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    const count = items.reduce((s, i) => s + i.qty, 0);
    res.json({ success: true, items, total, count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/cart/add
router.post('/add', async (req, res) => {
  try {
    const { productId, size, qty = 1 } = req.body;
    if (!productId || !size)
      return res.status(400).json({ success: false, message: 'productId and size required' });

    const product = await Product.findById(productId);
    if (!product || !product.isActive)
      return res.status(404).json({ success: false, message: 'Product not found' });
    if (product.stock < 1)
      return res.status(400).json({ success: false, message: 'Out of stock' });

    const cart = await getOrCreate(req.user._id);
    const existing = cart.items.find(i => i.product.toString() === productId && i.size === size);
    if (existing) {
      existing.qty = Math.min(10, existing.qty + Number(qty));
    } else {
      cart.items.push({
        product: product._id,
        name: product.name,
        price: product.price,
        art: product.art,
        imageUrl: product.imageUrl || '',
        category: product.category,
        size,
        qty: Number(qty),
      });
    }
    await cart.save();
    const total = cart.items.reduce((s, i) => s + i.price * i.qty, 0);
    const count = cart.items.reduce((s, i) => s + i.qty, 0);
    res.json({ success: true, items: cart.items, total, count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/cart/:itemId — update qty
router.put('/:itemId', async (req, res) => {
  try {
    const { qty } = req.body;
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    const item = cart.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    item.qty = Math.max(1, Math.min(10, Number(qty)));
    await cart.save();
    res.json({ success: true, items: cart.items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/cart/:itemId — remove item
router.delete('/:itemId', async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });
    cart.items = cart.items.filter(i => i._id.toString() !== req.params.itemId);
    await cart.save();
    res.json({ success: true, items: cart.items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/cart — clear all
router.delete('/', async (req, res) => {
  try {
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
    res.json({ success: true, message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
