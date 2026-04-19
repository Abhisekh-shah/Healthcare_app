
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const { asyncHandler } = require('../middleware/errorHandler');
const { paginate, paginatedResponse } = require('../utils/pagination');

// GET /api/admin/dashboard
const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalDoctors,
    totalAppointments,
    pendingAppointments,
    todayAppointments,
    recentActivity,
  ] = await Promise.all([
    User.countDocuments({ role: 'patient' }),
    Doctor.countDocuments(),
    Appointment.countDocuments(),
    Appointment.countDocuments({ status: 'pending' }),
    Appointment.countDocuments({
      appointmentDate: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lte: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    }),
    Appointment.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('patient', 'name email')
      .populate({ path: 'doctor', populate: { path: 'user', select: 'name' } }),
  ]);

  // Appointments by status breakdown
  const statusBreakdown = await Appointment.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  // Monthly appointments (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const monthlyStats = await Appointment.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  // Get pending verification doctors count
  const pendingVerificationDoctors = await Doctor.countDocuments({ 
    isVerified: false, 
    isRejected: { $ne: true } 
  });

  res.json({
    success: true,
    stats: {
      totalUsers,
      totalDoctors,
      totalAppointments,
      pendingAppointments,
      todayAppointments,
      pendingVerificationDoctors,
      statusBreakdown,
      monthlyStats,
      recentActivity,
    },
  });
});

// GET /api/admin/users
const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, role, search, isActive } = req.query;
  const { skip, limit: lim, page: pg } = paginate(null, page, limit);

  const filter = {};
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim),
    User.countDocuments(filter),
  ]);

  res.json({ success: true, ...paginatedResponse(users, total, pg, lim) });
});

// PATCH /api/admin/users/:id/toggle-status
const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user.role === 'admin') {
    return res.status(400).json({ success: false, message: 'Cannot deactivate admin accounts' });
  }

  user.isActive = !user.isActive;
  await user.save();

  res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, user });
});

// GET /api/admin/doctors - Get all doctors with status filtering
const getAllDoctorsForAdmin = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, specialization, status } = req.query;
  const { skip, limit: lim, page: pg } = paginate(null, page, limit);

  let filter = {};
  
  // Handle status filter: 'all', 'accepted', 'pending', 'rejected'
  if (status && status !== 'all') {
    if (status === 'accepted') {
      filter.isVerified = true;
      filter.isRejected = false;
    } else if (status === 'pending') {
      filter.isVerified = false;
      filter.isRejected = false;
    } else if (status === 'rejected') {
      filter.isRejected = true;
    }
  }
  
  if (specialization) {
    filter.specialization = { $regex: specialization, $options: 'i' };
  }

  // Build aggregation to search by doctor name
  let pipeline = [
    { $match: filter },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    { $match: { 'user.isActive': true } },
  ];

  if (search) {
    pipeline.push({ 
      $match: { 
        $or: [
          { 'user.name': { $regex: search, $options: 'i' } },
          { 'user.email': { $regex: search, $options: 'i' } }
        ]
      } 
    });
  }

  const countPipeline = [...pipeline, { $count: 'total' }];

  pipeline.push(
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: lim },
    {
      $project: {
        'user.password': 0,
        'user.refreshToken': 0,
      },
    }
  );

  const [doctors, countResult] = await Promise.all([
    Doctor.aggregate(pipeline),
    Doctor.aggregate(countPipeline),
  ]);

  const total = countResult[0]?.total || 0;
  res.json({ success: true, ...paginatedResponse(doctors, total, pg, lim) });
});

// POST /api/admin/doctors — admin creates a verified doctor
const createDoctor = asyncHandler(async (req, res) => {
  const {
    name, email, password, phone,
    specialization, qualifications, experience, consultationFee, bio, hospital,
  } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Email already exists' });
  }

  const user = await User.create({ 
    name, 
    email, 
    password, 
    role: 'doctor', 
    phone,
    isActive: true 
  });
  
  const doctor = await Doctor.create({
    user: user._id,
    specialization,
    qualifications: qualifications || [],
    experience: experience || 0,
    consultationFee: consultationFee || 0,
    bio,
    hospital,
    isVerified: true, // Admin-created doctors are pre-verified
    isRejected: false,
    isAcceptingAppointments: true,
  });

  const populated = await doctor.populate('user', '-password -refreshToken');
  res.status(201).json({ success: true, message: 'Doctor created', doctor: populated });
});

// PUT /api/admin/doctors/:id
const updateDoctor = asyncHandler(async (req, res) => {
  const allowedFields = [
    'specialization', 'qualifications', 'experience', 'consultationFee',
    'bio', 'hospital', 'languages', 'isVerified', 'isAcceptingAppointments',
  ];
  const updates = {};
  allowedFields.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const doctor = await Doctor.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  }).populate('user', '-password -refreshToken');

  if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
  res.json({ success: true, doctor });
});

// DELETE /api/admin/doctors/:id
const deleteDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

  await User.findByIdAndUpdate(doctor.user, { isActive: false });
  await doctor.deleteOne();

  res.json({ success: true, message: 'Doctor removed' });
});

// PUT /api/admin/doctors/:id/verify - Simple accept/reject
const verifyDoctor = asyncHandler(async (req, res) => {
  const { verified } = req.body;
  
  if (typeof verified !== 'boolean') {
    return res.status(400).json({ 
      success: false, 
      message: 'Verified status must be a boolean (true/false)' 
    });
  }

  const updateData = {
    isVerified: verified,
    isRejected: !verified, // If not verified, mark as rejected
  };

  const doctor = await Doctor.findByIdAndUpdate(
    req.params.id,
    updateData,
    { 
      new: true,
      runValidators: true 
    }
  ).populate('user', 'name email phone');

  if (!doctor) {
    return res.status(404).json({ success: false, message: 'Doctor not found' });
  }

  res.json({ 
    success: true, 
    message: `Doctor ${verified ? 'accepted' : 'rejected'} successfully`,
    doctor: {
      _id: doctor._id,
      name: doctor.user?.name,
      email: doctor.user?.email,
      isVerified: doctor.isVerified,
      isRejected: doctor.isRejected,
      specialization: doctor.specialization
    }
  });
});

// GET /api/admin/appointments
const getAllAppointments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, from, to } = req.query;
  const { skip, limit: lim, page: pg } = paginate(null, page, limit);

  const filter = {};
  if (status) filter.status = status;
  if (from || to) {
    filter.appointmentDate = {};
    if (from) filter.appointmentDate.$gte = new Date(from);
    if (to) filter.appointmentDate.$lte = new Date(to);
  }

  const [appointments, total] = await Promise.all([
    Appointment.find(filter)
      .populate('patient', 'name email')
      .populate({ path: 'doctor', populate: { path: 'user', select: 'name' } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(lim),
    Appointment.countDocuments(filter),
  ]);

  res.json({ success: true, ...paginatedResponse(appointments, total, pg, lim) });
});

module.exports = {
  getDashboardStats,
  getAllUsers,
  toggleUserStatus,
  getAllDoctorsForAdmin, 
  createDoctor,
  updateDoctor,
  deleteDoctor,
  verifyDoctor,
  getAllAppointments,
};