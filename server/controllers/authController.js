const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateId } = require('../utils/helpers');

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Username and password are required' });
        }

        const user = await User.findOne({ username });

        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid username or password' });
        }

        const isMatch = bcrypt.compareSync(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid username or password' });
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
            password_hash: hashedPassword,
            role: role || 'receptionist',
            name: name || username
        });

        res.json({ success: true, message: 'User registered successfully' });
    } catch (e) {
        res.status(400).json({ success: false, error: 'Username already exists' });
    }
};
