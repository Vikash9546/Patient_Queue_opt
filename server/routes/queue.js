const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');

router.get('/', queueController.getQueue);
router.post('/walkin', queueController.addWalkIn);
router.post('/emergency', queueController.addEmergency);
router.post('/checkin', queueController.checkIn);
router.put('/reorder', queueController.reorder);
router.post('/rebalance', queueController.rebalance);
router.post('/next', queueController.callNext);

module.exports = router;
