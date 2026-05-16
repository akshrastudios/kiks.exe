const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Product name is required'], trim: true },
  // sparse:true means null/undefined slugs are excluded from the unique index
  // — prevents duplicate key errors when insertMany bypasses the pre-save hook
  slug: { type: String, unique: true, sparse: true, lowercase: true },
  category: {
    type: String,
    required: true,
    enum: ['Sneakers', 'Hoodies', 'Caps', 'Bottoms', 'Bags', 'Accessories', 'Collab'],
  },
  badge: {
    type: String,
    enum: ['New', 'Hot', 'Ltd', 'Sale', null],
    default: null,
  },
  price: { type: Number, required: [true, 'Price is required'], min: 0 },
  originalPrice: { type: Number, default: null },
  stock: { type: Number, required: true, default: 50, min: 0 },
  art: { type: String, default: 'art-1' }, // CSS art class
  imageUrl: { type: String, default: '' },  // Optional real image URL
  sizes: { type: [String], required: true },
  colors: { type: [String], default: [] },
  description: { type: String, required: true },
  features: { type: [String], default: [] },
  tag: { type: String, default: '' },
  reviews: [reviewSchema],
  rating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
}, { timestamps: true });

// Auto-generate slug from name
productSchema.pre('save', function (next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

// Recalculate rating on review changes
productSchema.methods.updateRating = function () {
  if (this.reviews.length === 0) {
    this.rating = 0;
    this.numReviews = 0;
  } else {
    const total = this.reviews.reduce((sum, r) => sum + r.rating, 0);
    this.rating = Math.round((total / this.reviews.length) * 10) / 10;
    this.numReviews = this.reviews.length;
  }
};

module.exports = mongoose.model('Product', productSchema);
