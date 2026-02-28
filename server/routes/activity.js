const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');

// GET /api/activity
router.get('/', activityController.getActivityLogs);

module.exports = router;
