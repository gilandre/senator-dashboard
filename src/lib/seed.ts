import mongoose from 'mongoose';
import { hash } from 'bcrypt';
import { connectToDatabase } from './mongodb';

// Define User interface
interface UserDocument extends mongoose.Document {
  email: string;
  password: string;
  name: string;
  role: string;
}

// Define User schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: "user" },
});

// Create or use existing User model
const User = (mongoose.models.User || mongoose.model("User", userSchema)) as mongoose.Model<UserDocument>;

export async function seedDatabase() {
  try {
    console.log('Connecting to database...');
    await connectToDatabase();
    
    // Check if admin user already exists
    const adminExists = await User.findOne({ email: 'admin@senator.com' });
    
    if (adminExists) {
      console.log('Admin user already exists, skipping seeding');
      return;
    }
    
    // Create hashed password
    const hashedPassword = await hash('Admin123!', 10);
    
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
    console.error('Error seeding database:', error);
  }
}

// Execute if this file is run directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
} 