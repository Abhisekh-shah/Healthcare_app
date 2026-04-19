

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyAppointments } from '../../services/appointmentService';
import { formatDate, getStatusColor } from '../../utils/helpers';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  CalendarDaysIcon, MagnifyingGlassIcon, ClockIcon,
  CheckCircleIcon, XCircleIcon, UserGroupIcon,
} from '@heroicons/react/24/outline';

// Helper function to format doctor name without duplicate "Dr."
const formatDoctorName = (name) => {
  if (!name) return 'Doctor';
  // Remove any existing "Dr." prefix
  let cleanName = name.replace(/^Dr\.\s*/i, '');
  return cleanName;
};

export default function PatientDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({ total: 0, upcoming: 0, completed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await getMyAppointments({ limit: 5 });
        setAppointments(data.data);
        const all = data.data;
        setStats({
          total: data.pagination.total,
          upcoming: all.filter((a) => ['pending', 'confirmed'].includes(a.status)).length,
          completed: all.filter((a) => a.status === 'completed').length,
          cancelled: all.filter((a) => a.status === 'cancelled').length,
        });
      } catch {}
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const statCards = [
    { label: 'Total Appointments', value: stats.total, icon: CalendarDaysIcon, color: 'text-blue-600 bg-blue-50' },
    { label: 'Upcoming', value: stats.upcoming, icon: ClockIcon, color: 'text-yellow-600 bg-yellow-50' },
    { label: 'Completed', value: stats.completed, icon: CheckCircleIcon, color: 'text-green-600 bg-green-50' },
    { label: 'Cancelled', value: stats.cancelled, icon: XCircleIcon, color: 'text-red-600 bg-red-50' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name?.split(' ')[0]}!</h1>
        <p className="text-gray-500 mt-1">Manage your health appointments</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link
          to="/patient/doctors"
          className="card flex items-center gap-4 hover:border-blue-300 hover:shadow-md transition group"
        >
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition">
            <MagnifyingGlassIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Find a Doctor</h3>
            <p className="text-sm text-gray-500">Search by specialization</p>
          </div>
        </Link>
        <Link
          to="/patient/appointments"
          className="card flex items-center gap-4 hover:border-blue-300 hover:shadow-md transition group"
        >
          <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition">
            <CalendarDaysIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">My Appointments</h3>
            <p className="text-sm text-gray-500">View & manage bookings</p>
          </div>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card">
            <div className={`inline-flex p-2 rounded-lg ${color} mb-3`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{loading ? '—' : value}</div>
            <div className="text-sm text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Recent appointments */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Appointments</h2>
          <Link to="/patient/appointments" className="text-sm text-blue-600 hover:underline">View all</Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-10">
            <UserGroupIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No appointments yet</p>
            <Link to="/patient/doctors" className="btn-primary mt-4 text-sm">Book Your First Appointment</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appt) => (
              <div key={appt._id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm">
                    {appt.doctor?.user?.name?.[0] || 'D'}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">
                      Dr. {formatDoctorName(appt.doctor?.user?.name)}
                    </p>
                    <p className="text-xs text-gray-500">{appt.doctor?.specialization}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{formatDate(appt.appointmentDate)}</p>
                  <p className="text-xs text-gray-500">{appt.timeSlot?.startTime}</p>
                  <span className={`badge ${getStatusColor(appt.status)} mt-1`}>{appt.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}