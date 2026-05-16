require('dotenv').config();

const REQUIRED_ENV = ['MONGODB_URI', 'JWT_SECRET'];
const MISSING = REQUIRED_ENV.filter(k => !process.env[k]);
if (MISSING.length) {
  console.error(`❌ Missing env vars: ${MISSING.join(', ')}. Add them in .env or Vercel Dashboard.`);
}

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const path       = require('path');
const connectDB  = require('./config/db');

const app = express();
connectDB();

app.use(helmet({ contentSecurityPolicy: false }));

const general = rateLimit({ windowMs: 15*60*1000, max: 200, standardHeaders: true, legacyHeaders: false });
const auth    = rateLimit({ windowMs: 15*60*1000, max: 20,  message: { success: false, message: 'Too many attempts, please try again in 15 minutes' } });
const order   = rateLimit({ windowMs: 60*60*1000, max: 30,  message: { success: false, message: 'Too many orders placed, please slow down' } });

app.use(general);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth',     auth,  require('./routes/auth'));
app.use('/api/products',        require('./routes/products'));
app.use('/api/promos',          require('./routes/promos'));
app.use('/api/cart',            require('./routes/cart'));
app.use('/api/orders',  order,  require('./routes/orders'));
app.use('/api/admin',           require('./routes/admin'));

app.get('/api/health', (req, res) => res.json({ status: 'OK', store: 'KIKS.EXE', time: new Date() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🔥 KIKS.EXE server running on http://localhost:${PORT}`);
  console.log(`📦 MongoDB: ${process.env.MONGODB_URI}`);
  console.log(`👟 Run "npm run seed" to seed products, admin & promo codes\n`);
});
