const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  art: String,
  imageUrl: String,
  category: String,
  size: { type: String, required: true },
  qty: { type: Number, required: true, min: 1 },
});

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderNumber: { type: String, unique: true },
  items: [orderItemSchema],
  shippingAddress: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'UPI', 'Card'],
    required: true,
  },
  paymentInfo: {
    upiId: String,
    cardLast4: String,
  },
  subtotal: { type: Number, required: true },
  shippingCharge: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  promoCode: { type: String },
  total: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  statusHistory: [
    {
      status: String,
      note: String,
      updatedAt: { type: Date, default: Date.now },
    },
  ],
  trackingNumber: { type: String },
  deliveredAt: { type: Date },
  cancelReason: { type: String },
  notes: { type: String },
}, { timestamps: true });

// Auto-generate order number
orderSchema.pre('save', async function (next) {
  if (this.isNew) {
    const date = new Date();
    const y = date.getFullYear().toString().slice(-2);
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.orderNumber = `KKS-${y}${m}-${rand}`;
    this.statusHistory.push({ status: 'pending', note: 'Order placed' });
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);