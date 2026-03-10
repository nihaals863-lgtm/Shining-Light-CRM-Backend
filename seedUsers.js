const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected for seeding');

        // Check if admin exists
        let adminUser = await User.findOne({ email: 'admin@gmail.com' });
        if (!adminUser) {
            await User.create({
                name: 'System Admin',
                email: 'admin@gmail.com',
                password: '123',
                role: 'admin'
            });
            console.log('Admin user created');
        } else {
            console.log('Admin user already exists');
        }

        // Check if staff exists
        let staffUser = await User.findOne({ email: 'staff@gmail.com' });
        if (!staffUser) {
            await User.create({
                name: 'System Staff',
                email: 'staff@gmail.com',
                password: '123',
                role: 'staff'
            });
            console.log('Staff user created');
        } else {
            console.log('Staff user already exists');
        }

        console.log('Data successfully seeded!');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

seedUsers();
