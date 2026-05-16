const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: String,
  price: Number,
  art: String,
  imageUrl: String,
  category: String,
  size: { type: String, required: true },
  qty: { type: Number, required: true, min: 1, max: 10, default: 1 },
});

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [cartItemSchema],
}, { timestamps: true });

// Virtual: total
cartSchema.virtual('total').get(function () {
  return this.items.reduce((sum, item) => sum + item.price * item.qty, 0);
});

cartSchema.virtual('count').get(function () {
  return this.items.reduce((sum, item) => sum + item.qty, 0);
});

module.exports = mongoose.model('Cart', cartSchema);
