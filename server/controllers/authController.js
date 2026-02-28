const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateId } = require('../utils/helpers');

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });

        if (!user) {
            // Create demo user on the fly
            const token = jwt.sign(
                { id: 'demo', username, role: 'receptionist', name: username },
                process.env.JWT_SECRET || 'mediqueue_secret_key_2024',
                { expiresIn: '24h' }
            );
            return res.json({
                success: true,
                token,
                user: { id: 'demo', username, role: 'receptionist', name: username }
            });
        }

        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role, name: user.name },
            process.env.JWT_SECRET || 'mediqueue_secret_key_2024',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: { id: user._id, username: user.username, role: user.role, name: user.name }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.register = async (req, res) => {
    const { username, password, name, role } = req.body;
    const id = generateId();
    const hashedPassword = bcrypt.hashSync(password || 'password123', 10);

    try {
        await User.create({
            _id: id,
            username,
            password: hashedPassword,
            role: role || 'receptionist',
            name: name || username
        });

        res.json({ success: true, message: 'User registered successfully' });
    } catch (e) {
        res.status(400).json({ success: false, error: 'Username already exists' });
    }
};
