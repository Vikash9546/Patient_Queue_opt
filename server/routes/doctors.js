const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');

router.get('/', doctorController.getAll);
router.get('/:id', doctorController.getById);
router.get('/:id/schedule', doctorController.getSchedule);
router.get('/:id/slots', doctorController.getAvailableSlots);
router.get('/:id/workload', doctorController.getWorkload);
router.put('/:id/status', doctorController.updateStatus);

module.exports = router;
