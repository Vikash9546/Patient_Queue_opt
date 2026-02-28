const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../config/database');
const { generateId } = require('../utils/helpers');

exports.login = (req, res) => {
    const { username, password } = req.body;

    // Demo mode: accept any login
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

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
        { id: user.id, username: user.username, role: user.role, name: user.name },
        process.env.JWT_SECRET || 'mediqueue_secret_key_2024',
        { expiresIn: '24h' }
    );

    res.json({
        success: true,
        token,
        user: { id: user.id, username: user.username, role: user.role, name: user.name }
    });
};

exports.register = (req, res) => {
    const { username, password, name, role } = req.body;
    const id = generateId();
    const hashedPassword = bcrypt.hashSync(password || 'password123', 10);

    try {
        db.prepare('INSERT INTO users (id, username, password, role, name) VALUES (?, ?, ?, ?, ?)')
            .run(id, username, hashedPassword, role || 'receptionist', name || username);

        res.json({ success: true, message: 'User registered successfully' });
    } catch (e) {
        res.status(400).json({ success: false, error: 'Username already exists' });
    }
};
