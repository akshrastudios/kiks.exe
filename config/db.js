const mongoose = require('mongoose');

const connectDB = async () => {
  // Always check global directly — the local `cached` variable would be
  // stale after the first call since it's captured at module-load time.
  if (global._mongooseConnection && global._mongooseConnection.readyState === 1) {
    return global._mongooseConnection;
  }

  // If a connection is already pending, wait for it
  if (global._mongoosePromise) {
    await global._mongoosePromise;
    return mongoose.connection;
  }

  try {
    global._mongoosePromise = mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser:    true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS:          45000,
    });

    await global._mongoosePromise;
    global._mongooseConnection = mongoose.connection;
    console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
    return mongoose.connection;
  } catch (error) {
    global._mongoosePromise = null;
    console.error(`❌ MongoDB Error: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;

