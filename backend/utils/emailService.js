
const nodemailer = require('nodemailer');

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    console.log('✅ Email sent to:', to, 'Message ID:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Email send error:', error.message);
    return false;
  }
};

// Helper function to clean doctor name (remove duplicate Dr.)
const cleanDoctorName = (name) => {
  if (!name) return 'the doctor';
  // Remove multiple "Dr." prefixes
  let cleaned = name.replace(/^(Dr\.\s*)+/i, '');
  // Add single "Dr." prefix
  return `Dr. ${cleaned}`;
};

// Fixed: No duplicate "Dr." or "Doctor" label
const appointmentConfirmationEmail = (patientName, doctorName, date, timeSlot) => ({
  subject: 'Appointment Booking Confirmed',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2563EB; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">Appointment Confirmed</h1>
      </div>
      <div style="padding: 24px; background: #f9fafb; border-radius: 0 0 8px 8px;">
        <p>Dear <strong>${patientName}</strong>,</p>
        <p>Your appointment has been successfully booked with ${cleanDoctorName(doctorName)}.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 8px; font-weight: bold;">Date</td>
            <td style="padding: 8px;">${new Date(date).toDateString()}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 8px; font-weight: bold;">Time</td>
            <td style="padding: 8px;">${timeSlot.startTime} – ${timeSlot.endTime}</td>
          </tr>
        </table>
        <p style="color: #6b7280; font-size: 14px;">Please arrive 10 minutes before your scheduled time.</p>
      </div>
    </div>
  `,
});

const appointmentStatusEmail = (patientName, status, date, timeSlot, doctorName) => ({
  subject: `Appointment ${status.charAt(0).toUpperCase() + status.slice(1)}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${status === 'confirmed' ? '#16a34a' : '#dc2626'}; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">Appointment ${status.charAt(0).toUpperCase() + status.slice(1)}</h1>
      </div>
      <div style="padding: 24px; background: #f9fafb;">
        <p>Dear <strong>${patientName}</strong>,</p>
        <p>Your appointment ${doctorName ? `with ${cleanDoctorName(doctorName)}` : ''} on <strong>${new Date(date).toDateString()}</strong> at <strong>${timeSlot?.startTime || 'scheduled time'}</strong> has been <strong>${status}</strong>.</p>
        ${status === 'rejected' || status === 'cancelled' ? '<p>Please book another appointment at your convenience.</p>' : ''}
      </div>
    </div>
  `,
});

module.exports = { sendEmail, appointmentConfirmationEmail, appointmentStatusEmail };