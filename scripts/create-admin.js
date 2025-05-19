// This script creates an admin user in the database
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/senatorDb';

// Define User schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: "user" },
});

// Create or use existing User model
const User = mongoose.models.User || mongoose.model("User", userSchema);

async function createAdminUser() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    
    // Check if admin user already exists
    const adminExists = await User.findOne({ email: 'admin@senator.com' });
    
    if (adminExists) {
      console.log('Admin user already exists, skipping creation');
      return;
    }
    
    // Create hashed password
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    
    // Create admin user
    const adminUser = new User({
      email: 'admin@senator.com',
      password: hashedPassword,
      name: 'Administrateur',
      role: 'admin',
    });
    
    await adminUser.save();
    console.log('Admin user created successfully');
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

// Run the function
createAdminUser()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 