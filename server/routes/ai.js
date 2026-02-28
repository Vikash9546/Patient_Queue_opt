const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/triage', aiController.triage);
router.post('/estimate-duration', aiController.estimateDuration);
router.post('/no-show', aiController.predictNoShow);
router.post('/suggest-slots', aiController.suggestSlots);
router.post('/chat', aiController.chat);

module.exports = router;
