const Doctor = require('../models/Doctor');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { paginate, paginatedResponse } = require('../utils/pagination');

// GET /api/doctors  (public — search & list)
const getDoctors = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, specialization, name, minFee, maxFee, sort = '-createdAt' } = req.query;
  const { skip, limit: lim, page: pg } = paginate(null, page, limit);

  const filter = { isVerified: true };
  if (specialization) filter.specialization = { $regex: specialization, $options: 'i' };

  // Build aggregation to filter by doctor user name
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

  if (name) {
    pipeline.push({ $match: { 'user.name': { $regex: name, $options: 'i' } } });
  }
  if (minFee || maxFee) {
    const feeFilter = {};
    if (minFee) feeFilter.$gte = parseFloat(minFee);
    if (maxFee) feeFilter.$lte = parseFloat(maxFee);
    pipeline.push({ $match: { consultationFee: feeFilter } });
  }

  const countPipeline = [...pipeline, { $count: 'total' }];

  const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
  const sortOrder = sort.startsWith('-') ? -1 : 1;
  pipeline.push({ $sort: { [sortField]: sortOrder } }, { $skip: skip }, { $limit: lim });

  // Remove password from user
  pipeline.push({
    $project: {
      'user.password': 0,
      'user.refreshToken': 0,
    },
  });

  const [doctors, countResult] = await Promise.all([
    Doctor.aggregate(pipeline),
    Doctor.aggregate(countPipeline),
  ]);

  const total = countResult[0]?.total || 0;
  res.json({ success: true, ...paginatedResponse(doctors, total, pg, lim) });
});

// GET /api/doctors/:id  (public)
const getDoctorById = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id).populate('user', '-password -refreshToken');
  if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
  res.json({ success: true, doctor });
});

// GET /api/doctors/:id/slots  (public — get available slots for a date)
const getDoctorAvailableSlots = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ success: false, message: 'Date is required' });

  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

  const requestedDate = new Date(date);
  const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][requestedDate.getDay()];

  const dayAvailability = doctor.availability.find(
    (a) => a.day === dayName && a.isAvailable
  );
  if (!dayAvailability) {
    return res.json({ success: true, slots: [], message: 'Doctor not available on this day' });
  }

  // Generate time slots from start to end
  const slots = generateTimeSlots(dayAvailability.startTime, dayAvailability.endTime, dayAvailability.slotDuration);

  // Find booked slots for that day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const bookedAppointments = await require('../models/Appointment').find({
    doctor: req.params.id,
    appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['pending', 'confirmed'] },
  }).select('timeSlot');

  const bookedTimes = new Set(bookedAppointments.map((a) => a.timeSlot.startTime));

  const availableSlots = slots.map((slot) => ({
    ...slot,
    isBooked: bookedTimes.has(slot.startTime),
  }));

  res.json({ success: true, slots: availableSlots });
});

const generateTimeSlots = (start, end, duration) => {
  const slots = [];
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let current = sh * 60 + sm;
  const endMins = eh * 60 + em;

  while (current + duration <= endMins) {
    const startH = String(Math.floor(current / 60)).padStart(2, '0');
    const startM = String(current % 60).padStart(2, '0');
    const endH = String(Math.floor((current + duration) / 60)).padStart(2, '0');
    const endM = String((current + duration) % 60).padStart(2, '0');
    slots.push({ startTime: `${startH}:${startM}`, endTime: `${endH}:${endM}` });
    current += duration;
  }
  return slots;
};

// PUT /api/doctors/profile  (doctor)
const updateDoctorProfile = asyncHandler(async (req, res) => {
  const allowedFields = [
    'specialization', 'qualifications', 'experience', 'consultationFee',
    'bio', 'hospital', 'languages', 'isAcceptingAppointments',
  ];

  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const doctor = await Doctor.findOneAndUpdate(
    { user: req.user._id },
    updates,
    { new: true, runValidators: true }
  ).populate('user', '-password -refreshToken');

  if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found' });
  res.json({ success: true, doctor });
});

// PUT /api/doctors/availability  (doctor)
const updateAvailability = asyncHandler(async (req, res) => {
  const { availability } = req.body;
  if (!Array.isArray(availability)) {
    return res.status(400).json({ success: false, message: 'Availability must be an array' });
  }

  const doctor = await Doctor.findOneAndUpdate(
    { user: req.user._id },
    { availability },
    { new: true, runValidators: true }
  );

  if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found' });
  res.json({ success: true, message: 'Availability updated', availability: doctor.availability });
});

module.exports = {
  getDoctors,
  getDoctorById,
  getDoctorAvailableSlots,
  updateDoctorProfile,
  updateAvailability,
};
