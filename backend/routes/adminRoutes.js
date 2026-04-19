

const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAllUsers,
  toggleUserStatus,
  getAllDoctorsForAdmin,  
  createDoctor,
  updateDoctor,
  deleteDoctor,
  verifyDoctor,
  getAllAppointments,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/users', getAllUsers);
router.patch('/users/:id/toggle-status', toggleUserStatus);

// Doctor management routes
router.get('/doctors', getAllDoctorsForAdmin);  
router.post('/doctors', createDoctor);
router.put('/doctors/:id', updateDoctor);
router.delete('/doctors/:id', deleteDoctor);
router.put('/doctors/:id/verify', verifyDoctor);


router.get('/appointments', getAllAppointments);

module.exports = router;