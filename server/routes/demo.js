const express = require('express');
const router = express.Router();
const demoController = require('../controllers/demoController');

router.post('/simulate', demoController.simulate);
router.post('/reset', demoController.reset);

module.exports = router;
