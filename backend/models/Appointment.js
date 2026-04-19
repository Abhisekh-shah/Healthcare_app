const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
    },
    appointmentDate: {
      type: Date,
      required: [true, 'Appointment date is required'],
    },
    timeSlot: {
      startTime: { type: String, required: true }, 
      endTime: { type: String, required: true },   
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'rejected', 'cancelled', 'completed'],
      default: 'pending',
    },
    type: {
      type: String,
      enum: ['in-person'],
      default: 'in-person',
    },
    symptoms: {
      type: String,
      maxlength: [500, 'Symptoms description cannot exceed 500 characters'],
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 1000 characters'],
    },
    prescription: {
      type: String,
    },
    cancellationReason: String,
    cancelledBy: {
      type: String,
      enum: ['patient', 'doctor', 'admin'],
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    fee: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Compound index to prevent double-booking
appointmentSchema.index(
  { doctor: 1, appointmentDate: 1, 'timeSlot.startTime': 1, status: 1 },
  { unique: false }
);

appointmentSchema.index({ patient: 1, appointmentDate: -1 });
appointmentSchema.index({ doctor: 1, appointmentDate: -1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
