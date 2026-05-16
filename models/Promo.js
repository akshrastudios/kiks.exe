const mongoose = require('mongoose');

const promoSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
  },
  discountPct: {
    type: Number,
    required: [true, 'Discount percentage is required'],
    min: 1,
    max: 90,
  },
  isActive: { type: Boolean, default: true },
  uses:     { type: Number, default: 0 },
  maxUses:  { type: Number, default: null }, // null = unlimited
}, { timestamps: true });

module.exports = mongoose.model('Promo', promoSchema);
