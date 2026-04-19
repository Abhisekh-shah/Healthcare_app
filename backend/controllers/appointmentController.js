
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { paginate, paginatedResponse } = require('../utils/pagination');
const { sendEmail, appointmentConfirmationEmail, appointmentStatusEmail } = require('../utils/emailService');

// POST /api/appointments  (patient)
const bookAppointment = asyncHandler(async (req, res) => {
  const { doctorId, appointmentDate, timeSlot, type, symptoms } = req.body;

  console.log('📝 Booking appointment for patient:', req.user.email);

  const doctor = await Doctor.findById(doctorId).populate('user', 'name email');
  if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
  if (!doctor.isAcceptingAppointments) {
    return res.status(400).json({ success: false, message: 'Doctor is not accepting appointments' });
  }

  // Check for conflicting appointment
  const conflict = await Appointment.findOne({
    doctor: doctorId,
    appointmentDate: new Date(appointmentDate),
    'timeSlot.startTime': timeSlot.startTime,
    status: { $in: ['pending', 'confirmed'] },
  });
  if (conflict) {
    return res.status(409).json({ success: false, message: 'This time slot is already booked' });
  }

  const appointment = await Appointment.create({
    patient: req.user._id,
    doctor: doctorId,
    appointmentDate: new Date(appointmentDate),
    timeSlot,
    type: type || 'in-person',
    symptoms,
    fee: doctor.consultationFee,
  });

  console.log('✅ Appointment created:', appointment._id);

  // Send confirmation email (with await to catch errors)
  try {
    console.log('📧 Attempting to send email to:', req.user.email);
    const emailData = appointmentConfirmationEmail(
      req.user.name,
      doctor.user.name,
      appointmentDate,
      timeSlot
    );
    await sendEmail({ to: req.user.email, subject: emailData.subject, html: emailData.html });
    console.log('✅ Email sent successfully');
  } catch (emailError) {
    console.error('❌ Email failed but appointment was created:', emailError.message);
    // Don't return error - appointment was still created
  }

  const populated = await appointment.populate([
    { path: 'doctor', populate: { path: 'user', select: 'name email' } },
  ]);

  res.status(201).json({ success: true, message: 'Appointment booked successfully', appointment: populated });
});

// GET /api/appointments/my  (patient — own appointments)
const getMyAppointments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, from, to } = req.query;
  const { skip, limit: lim, page: pg } = paginate(null, page, limit);

  const filter = { patient: req.user._id };
  if (status) filter.status = status;
  if (from || to) {
    filter.appointmentDate = {};
    if (from) filter.appointmentDate.$gte = new Date(from);
    if (to) filter.appointmentDate.$lte = new Date(to);
  }

  const [appointments, total] = await Promise.all([
    Appointment.find(filter)
      .populate({ path: 'doctor', populate: { path: 'user', select: 'name email profileImage' } })
      .sort({ appointmentDate: -1 })
      .skip(skip)
      .limit(lim),
    Appointment.countDocuments(filter),
  ]);

  res.json({ success: true, ...paginatedResponse(appointments, total, pg, lim) });
});

// PATCH /api/appointments/:id/cancel  (patient)
const cancelAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

  if (appointment.patient.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  if (['cancelled', 'completed', 'rejected'].includes(appointment.status)) {
    return res.status(400).json({ success: false, message: `Cannot cancel a ${appointment.status} appointment` });
  }

  appointment.status = 'cancelled';
  appointment.cancelledBy = 'patient';
  appointment.cancellationReason = req.body.reason || '';
  await appointment.save();

  res.json({ success: true, message: 'Appointment cancelled', appointment });
});

// GET /api/appointments/doctor  (doctor — own schedule)
const getDoctorAppointments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, date } = req.query;
  const { skip, limit: lim, page: pg } = paginate(null, page, limit);

  const doctorProfile = await Doctor.findOne({ user: req.user._id });
  if (!doctorProfile) return res.status(404).json({ success: false, message: 'Doctor profile not found' });

  const filter = { doctor: doctorProfile._id };
  if (status) filter.status = status;
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    filter.appointmentDate = { $gte: start, $lte: end };
  }

  const [appointments, total] = await Promise.all([
    Appointment.find(filter)
      .populate('patient', 'name email phone dateOfBirth gender')
      .sort({ appointmentDate: 1 })
      .skip(skip)
      .limit(lim),
    Appointment.countDocuments(filter),
  ]);

  res.json({ success: true, ...paginatedResponse(appointments, total, pg, lim) });
});

// PATCH /api/appointments/:id/status  (doctor — accept/reject/complete)
const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { status, notes, prescription } = req.body;
  const allowedStatuses = ['confirmed', 'rejected', 'completed'];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  const doctorProfile = await Doctor.findOne({ user: req.user._id });
  const appointment = await Appointment.findById(req.params.id).populate('patient', 'name email');

  if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
  if (appointment.doctor.toString() !== doctorProfile._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  appointment.status = status;
  if (notes) appointment.notes = notes;
  if (prescription) appointment.prescription = prescription;
  await appointment.save();

  // Notify patient (with await to catch errors)
  try {
    console.log('📧 Sending status update email to:', appointment.patient.email);
    const emailData = appointmentStatusEmail(
      appointment.patient.name,
      status,
      appointment.appointmentDate,
      appointment.timeSlot
    );
    await sendEmail({ to: appointment.patient.email, subject: emailData.subject, html: emailData.html });
    console.log('✅ Status email sent successfully');
  } catch (emailError) {
    console.error('❌ Status email failed:', emailError.message);
  }

  res.json({ success: true, message: `Appointment ${status}`, appointment });
});

// GET /api/appointments/:id  (any authorized user)
const getAppointmentById = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('patient', 'name email phone')
    .populate({ path: 'doctor', populate: { path: 'user', select: 'name email' } });

  if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

  const doctorProfile = await Doctor.findOne({ user: req.user._id });
  const isOwner =
    appointment.patient._id.toString() === req.user._id.toString() ||
    (doctorProfile && appointment.doctor._id.toString() === doctorProfile._id.toString()) ||
    req.user.role === 'admin';

  if (!isOwner) return res.status(403).json({ success: false, message: 'Not authorized' });

  res.json({ success: true, appointment });
});

module.exports = {
  bookAppointment,
  getMyAppointments,
  cancelAppointment,
  getDoctorAppointments,
  updateAppointmentStatus,
  getAppointmentById,
};