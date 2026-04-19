const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, changePassword } = require('../controllers/patientController');
const { protect, authorize } = require('../middleware/auth');

router.get('/profile', protect, authorize('patient'), getProfile);
router.put('/profile', protect, authorize('patient'), updateProfile);
router.put('/change-password', protect, authorize('patient'), changePassword);

module.exports = router;
