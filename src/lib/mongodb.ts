import mongoose from 'mongoose';

// MongoDB connection string - use environment variable or default to localhost
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/senatorDb';

/**
 * Connect to MongoDB database
 */
export async function connectToDatabase() {
  // If we're already connected, return the existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  
  try {
    // Establish a new connection
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Disconnect from MongoDB database
 */
export async function disconnectFromDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
} 