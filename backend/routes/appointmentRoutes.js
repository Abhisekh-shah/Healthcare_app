const express = require('express');
const router = express.Router();
const {
  bookAppointment,
  getMyAppointments,
  cancelAppointment,
  getDoctorAppointments,
  updateAppointmentStatus,
  getAppointmentById,
} = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/auth');
const { appointmentRules, validate } = require('../middleware/validate');

// Patient routes
router.post('/', protect, authorize('patient'), appointmentRules, validate, bookAppointment);
router.get('/my', protect, authorize('patient'), getMyAppointments);
router.patch('/:id/cancel', protect, authorize('patient'), cancelAppointment);

// Doctor routes
router.get('/doctor', protect, authorize('doctor'), getDoctorAppointments);
router.patch('/:id/status', protect, authorize('doctor'), updateAppointmentStatus);

// Shared
router.get('/:id', protect, getAppointmentById);

module.exports = router;
