const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

router.get('/daily', analyticsController.dailyStats);
router.get('/wait-times', analyticsController.waitTimes);
router.get('/utilization', analyticsController.utilization);
router.get('/peak-hours', analyticsController.peakHours);
router.get('/no-shows', analyticsController.noShows);
router.get('/before-after', analyticsController.beforeAfter);

module.exports = router;
