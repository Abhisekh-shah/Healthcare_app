
const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true,
  },
  startTime: { type: String, required: true }, // "09:00"
  endTime: { type: String, required: true },   // "17:00"
  slotDuration: { type: Number, default: 30 }, // minutes
  isAvailable: { type: Boolean, default: true },
}, { _id: true });

const doctorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      trim: true,
    },
    qualifications: [{ type: String, trim: true }],
    experience: {
      type: Number, 
      default: 0,
    },
    consultationFee: {
      type: Number,
      default: 0,
    },
    bio: {
      type: String,
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
    },
    availability: [timeSlotSchema],
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },
    hospital: {
      name: String,
      address: String,
    },
    languages: [{ type: String }],
    isVerified: {
      type: Boolean,
      default: false,
    },
    isRejected: {
      type: Boolean,
      default: false,
    },
 
    verifiedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    isAcceptingAppointments: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Text index for search
doctorSchema.index({ specialization: 'text' });

// Compound index for filtering
doctorSchema.index({ isVerified: 1, isRejected: 1 });
doctorSchema.index({ specialization: 1, isVerified: 1 });

module.exports = mongoose.model('Doctor', doctorSchema);