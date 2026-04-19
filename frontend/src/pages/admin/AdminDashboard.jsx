
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats } from '../../services/adminService';
import { formatDate, getStatusColor } from '../../utils/helpers';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  UsersIcon, UserGroupIcon, CalendarDaysIcon, ClockIcon,
} from '@heroicons/react/24/outline';

// Helper function to format doctor name without duplicate "Dr."
const formatDoctorName = (name) => {
  if (!name) return 'Doctor';
  // Remove any existing "Dr." prefix
  let cleanName = name.replace(/^Dr\.\s*/i, '');
  return cleanName;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(({ data }) => setStats(data.stats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  const statCards = [
    { label: 'Total Patients', value: stats?.totalUsers, icon: UsersIcon, color: 'text-blue-600 bg-blue-50', to: '/admin/activity' },
    { label: 'Total Doctors', value: stats?.totalDoctors, icon: UserGroupIcon, color: 'text-green-600 bg-green-50', to: '/admin/doctors' },
    { label: 'Total Appointments', value: stats?.totalAppointments, icon: CalendarDaysIcon, color: 'text-purple-600 bg-purple-50', to: '/admin/activity' },
    { label: 'Pending Appointments', value: stats?.pendingAppointments, icon: ClockIcon, color: 'text-yellow-600 bg-yellow-50', to: '/admin/activity' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">System overview and management</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, to }) => (
          <Link key={label} to={to} className="card hover:shadow-md transition group">
            <div className={`inline-flex p-2.5 rounded-xl ${color} mb-3`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{value ?? '—'}</div>
            <div className="text-sm text-gray-500 mt-0.5">{label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status breakdown */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Appointments by Status</h2>
          <div className="space-y-3">
            {stats?.statusBreakdown?.map(({ _id, count }) => (
              <div key={_id} className="flex items-center justify-between">
                <span className={`badge ${getStatusColor(_id)} capitalize`}>{_id}</span>
                <div className="flex items-center gap-3 flex-1 ml-4">
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(count / (stats.totalAppointments || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Appointments</h2>
            <Link to="/admin/activity" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {stats?.recentActivity?.slice(0, 6).map((appt) => (
              <div key={appt._id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-gray-900">{appt.patient?.name}</p>
                  {/* Fixed: Removed duplicate "Dr." */}
                  <p className="text-gray-500 text-xs">Dr. {formatDoctorName(appt.doctor?.user?.name)} · {formatDate(appt.appointmentDate)}</p>
                </div>
                <span className={`badge ${getStatusColor(appt.status)} capitalize`}>{appt.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly trend */}
      {stats?.monthlyStats?.length > 0 && (
        <div className="card mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Appointments (Last 6 Months)</h2>
          <div className="flex items-end gap-3 h-32">
            {stats.monthlyStats.map((m) => {
              const maxCount = Math.max(...stats.monthlyStats.map((x) => x.count));
              const height = (m.count / maxCount) * 100;
              const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              return (
                <div key={`${m._id.year}-${m._id.month}`} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-xs text-gray-600 font-medium">{m.count}</span>
                  <div
                    className="w-full bg-blue-500 rounded-t-md transition-all"
                    style={{ height: `${height}%`, minHeight: '4px' }}
                  />
                  <span className="text-xs text-gray-400">{monthNames[m._id.month]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}