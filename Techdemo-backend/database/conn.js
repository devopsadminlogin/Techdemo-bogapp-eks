const mongoose = require('mongoose');

// MongoDB connection string
const connectionString = process.env.MONGO_URI || 'mongodb://admin123@techdemoDb:27017';

// Connect to MongoDB
mongoose.connect(connectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Get the default connection
const db = mongoose.connection;

// Event listener for successful connection
db.on('connected', () => {
  console.log('Connected to MongoDB');
});

// Event listener for connection error
db.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// Event listener for disconnected
db.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

module.exports = mongoose;

