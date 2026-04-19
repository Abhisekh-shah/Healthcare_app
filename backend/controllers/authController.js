
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
} = require('../utils/tokenUtils');
const { asyncHandler } = require('../middleware/errorHandler');

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role = 'patient', phone, specialization } = req.body;

  // Only patients can self-register; doctors are added by admin (or allowed here with specialization)
  const allowedRoles = ['patient', 'doctor'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role' });
  }

  const user = await User.create({ name, email, password, role, phone });

  // If registering as doctor, create the Doctor profile
  if (role === 'doctor') {
    await Doctor.create({
      user: user._id,
      specialization: specialization || 'General Practitioner',
    });
  }

  const accessToken = generateAccessToken({ id: user._id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user._id, role: user.role });

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  setRefreshTokenCookie(res, refreshToken);

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    accessToken,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // SIMPLE ADMIN CHECK FROM .ENV
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  
  // If credentials match .env, force admin role
  if (ADMIN_EMAIL && ADMIN_PASSWORD && email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    // Find or create admin user
    let user = await User.findOne({ email: ADMIN_EMAIL });
    
    if (!user) {
      user = await User.create({
        name: 'Administrator',
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: 'admin',
        isActive: true,
      });
    } else if (user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }
    
    // Generate tokens
    const accessToken = generateAccessToken({ id: user._id, role: 'admin' });
    const refreshToken = generateRefreshToken({ id: user._id, role: 'admin' });
    
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    
    setRefreshTokenCookie(res, refreshToken);
    
    return res.json({
      success: true,
      message: 'Admin login successful',
      accessToken,
      user: { id: user._id, name: user.name, email: user.email, role: 'admin' },
    });
  }

  // Normal login for other users
  const user = await User.findOne({ email }).select('+password +refreshToken');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  if (!user.isActive) {
    return res.status(403).json({ success: false, message: 'Account is deactivated' });
  }

  const accessToken = generateAccessToken({ id: user._id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user._id, role: user.role });

  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  setRefreshTokenCookie(res, refreshToken);

  res.json({
    success: true,
    message: 'Login successful',
    accessToken,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

// POST /api/auth/refresh
const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Refresh token not found' });
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    return res.status(401).json({ success: false, message: 'Refresh token mismatch' });
  }

  const accessToken = generateAccessToken({ id: user._id, role: user.role });
  const newRefreshToken = generateRefreshToken({ id: user._id, role: user.role });

  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  setRefreshTokenCookie(res, newRefreshToken);

  res.json({ success: true, accessToken });
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (token) {
    await User.findOneAndUpdate(
      { refreshToken: token },
      { $unset: { refreshToken: '' } }
    );
  }

  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  let doctorProfile = null;

  if (user.role === 'doctor') {
    doctorProfile = await Doctor.findOne({ user: user._id });
  }

  res.json({ success: true, user, doctorProfile });
});

module.exports = { register, login, refreshToken, logout, getMe };