const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function main() {
  const client = new MongoClient('mongodb://localhost:27017/senatorDb');
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const users = db.collection('users');
    
    // Hash the password
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    // Update the user
    const result = await users.updateOne(
      { email: 'admin@senator.com' },
      { $set: { password: adminPassword } }
    );
    
    console.log('Update result:', result);
    console.log('Admin password updated successfully');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

main(); 