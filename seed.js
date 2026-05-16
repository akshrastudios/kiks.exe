require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const User    = require('./models/User');
const Product = require('./models/Product');
const Promo   = require('./models/Promo');

// Pexels CDN — do NOT append extra params, these URLs are complete as-is
const IMG = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=600&h=800&fit=crop`;

const PRODUCTS = [
  {
    name: 'Air Court Low',
    category: 'Sneakers', badge: 'New', price: 8999,
    originalPrice: null, stock: 60, art: 'art-1',
    imageUrl: IMG(12628400),
    sizes: ['UK6', 'UK7', 'UK8', 'UK9', 'UK10', 'UK11'],
    colors: ['#ffffff', '#1a1a1a'],
    description: 'Clean white court silhouette. Minimalist design meets maximum comfort. Studio-shot proof: these belong on a pedestal.',
    features: ['Premium leather upper', 'Air-cushioned sole', 'Signature KIKS toe box', 'Grip rubber outsole', 'Unisex sizing'],
    tag: 'SOLE OF THE WEEK', isFeatured: true, rating: 4.8, numReviews: 142,
  },
  {
    name: 'Phantom Runner',
    category: 'Sneakers', badge: 'Hot', price: 6999,
    originalPrice: null, stock: 45, art: 'art-2',
    imageUrl: IMG(1027130),
    sizes: ['UK6', 'UK7', 'UK8', 'UK9', 'UK10', 'UK11'],
    colors: ['#ff0000', '#ffffff'],
    description: 'Speed-engineered mesh upper with responsive foam cushioning. Born on the track. Worn on the street.',
    features: ['Breathable mesh upper', 'Responsive foam midsole', 'Padded ankle collar', 'Lightweight build', 'All-terrain outsole'],
    tag: 'FAST SELLER', isFeatured: true, rating: 4.6, numReviews: 98,
  },
  {
    name: 'High-Top Collab OG',
    category: 'Collab', badge: 'Ltd', price: 12999,
    originalPrice: 16999, stock: 25, art: 'art-3',
    imageUrl: IMG(14910512),
    sizes: ['UK6', 'UK7', 'UK8', 'UK9', 'UK10', 'UK11'],
    colors: ['#1a1a1a', '#8B4513'],
    description: 'The collab that broke the internet. High-top leather silhouette with embossed KIKS.EXE branding. Numbered limited release — only 25 pairs.',
    features: ['Full-grain leather upper', 'Embossed collab branding', 'Air-cushioned mid', 'Numbered pair tag', "Collector's box included"],
    tag: 'ONLY 25 PAIRS', isFeatured: true, rating: 4.9, numReviews: 67,
  },
  {
    name: 'Static Oversized Hoodie',
    category: 'Hoodies', badge: 'New', price: 3999,
    originalPrice: null, stock: 80, art: 'art-4',
    imageUrl: IMG(1816870),
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['#0a0a0f', '#1a1a2e'],
    description: 'Dropped shoulders. Deep pockets. 420gsm heavyweight fleece that hits different on cold nights. The hoodie you reach for first every time.',
    features: ['420gsm heavyweight fleece', 'Dropped shoulder fit', 'Ribbed cuffs and hem', 'Kangaroo pocket', 'Preshrunk — no shrinkage'],
    tag: 'MOST RESTOCKED', isFeatured: true, rating: 4.7, numReviews: 203,
  },
  {
    name: 'Grid Snapback',
    category: 'Caps', badge: 'Hot', price: 1499,
    originalPrice: null, stock: 120, art: 'art-5',
    imageUrl: IMG(4621424),
    sizes: ['One Size'],
    colors: ['#0a0a0f', '#4169E1', '#FF4500'],
    description: 'Six-panel structured crown. Flat brim. Embroidered KIKS.EXE grid logo on front panel. Snapback fits all.',
    features: ['6-panel structured crown', 'Flat brim', 'Embroidered grid logo', 'Snapback closure', 'One size fits most'],
    tag: 'DROP EXCLUSIVE', isFeatured: false, rating: 4.5, numReviews: 178,
  },
  {
    name: 'Cargo Track Pants',
    category: 'Bottoms', badge: 'New', price: 4499,
    originalPrice: null, stock: 65, art: 'art-6',
    imageUrl: IMG(19461553),
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: ['#0a0a0f', '#1C1C32'],
    description: 'Tapered cargo silhouette with utility pockets. KIKS side-stripe detail in electric blue. Pairs with everything in the lineup.',
    features: ['Tapered fit', 'Side leg cargo pockets', 'KIKS blue stripe detail', 'Elastic drawstring waist', 'Moisture-wicking fabric'],
    tag: 'COLLAB READY', isFeatured: false, rating: 4.6, numReviews: 89,
  },
  {
    name: 'Hypebeast Sling Pack',
    category: 'Bags', badge: null, price: 2999,
    originalPrice: null, stock: 50, art: 'art-7',
    imageUrl: IMG(11201513),
    sizes: ['One Size'],
    colors: ['#0a0a0f'],
    description: 'Compact sling pack. 1200D ripstop nylon. KIKS.EXE front logo. Fits your phone, wallet, AirPods. Nothing extra. Nothing missing.',
    features: ['1200D ripstop nylon', 'Padded back panel', 'Adjustable crossbody strap', 'YKK zipper pulls', 'Internal zip organizer'],
    tag: 'CARRY ESSENTIALS', isFeatured: false, rating: 4.4, numReviews: 56,
  },
  {
    name: 'Collab Graphic Tee',
    category: 'Collab', badge: 'Ltd', price: 1999,
    originalPrice: null, stock: 40, art: 'art-8',
    imageUrl: IMG(9920768),
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: ['#0a0a0f', '#f0f0ff'],
    description: 'Season 01 drop-print graphic tee. 100% ringspun cotton. Loose unisex fit. Screen-printed artwork — no reprints after this run.',
    features: ['100% ringspun cotton', 'Screen-printed graphic', 'Loose unisex fit', 'Crew neck', 'Limited print run — no restock'],
    tag: 'SERIES 01', isFeatured: false, rating: 4.7, numReviews: 134,
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ MongoDB Connected:', mongoose.connection.host);

    // Clear existing data
    await Promise.all([
      Product.deleteMany({}),
      User.deleteMany({ isAdmin: true }),
      Promo.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing products, admin & promos');

    // Seed products
    await Product.insertMany(PRODUCTS);
    console.log(`✅ Seeded ${PRODUCTS.length} products`);

    // Seed admin
    const adminPass = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@1234', 10);
    await User.create({
      name: 'KIKS Admin',
      email: process.env.ADMIN_EMAIL || 'admin@kiks-exe.com',
      password: adminPass,
      isAdmin: true,
    });
    console.log('✅ Admin account created');
    console.log('   Email:', process.env.ADMIN_EMAIL || 'admin@kiks-exe.com');
    console.log('   Password:', process.env.ADMIN_PASSWORD || 'Admin@1234');

    // Seed promo codes
    await Promo.insertMany([
      { code: 'KIKS10',  discountPct: 10, isActive: true },
      { code: 'DROP20',  discountPct: 20, isActive: true },
      { code: 'SOLE15',  discountPct: 15, isActive: true },
    ]);
    console.log('✅ Promo codes: KIKS10 · DROP20 · SOLE15');

    console.log('\n🔥 KIKS.EXE seed complete!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
}

seed();
