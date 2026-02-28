const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');

router.get('/', appointmentController.getAll);
router.get('/:id', appointmentController.getById);
router.post('/', appointmentController.book);
router.put('/:id', appointmentController.update);
router.delete('/:id', appointmentController.cancel);

module.exports = router;
