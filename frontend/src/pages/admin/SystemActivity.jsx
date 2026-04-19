

import { useState, useEffect, useCallback } from 'react';
import { getAllUsers, getAllAppointments, toggleUserStatus } from '../../services/adminService';
import { formatDate, getStatusColor, getErrorMessage } from '../../utils/helpers';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Helper function to format doctor name without duplicate "Dr."
const formatDoctorName = (name) => {
  if (!name) return 'Doctor';
  // Remove any existing "Dr." prefix
  let cleanName = name.replace(/^Dr\.\s*/i, '');
  return cleanName;
};

export default function SystemActivity() {
  const [activeTab, setActiveTab] = useState('appointments');

  // Appointments state
  const [appointments, setAppointments] = useState([]);
  const [apptPagination, setApptPagination] = useState(null);
  const [apptPage, setApptPage] = useState(1);
  const [apptStatus, setApptStatus] = useState('');
  const [apptLoading, setApptLoading] = useState(true);

  // Users state
  const [users, setUsers] = useState([]);
  const [userPagination, setUserPagination] = useState(null);
  const [userPage, setUserPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userLoading, setUserLoading] = useState(false);

  const fetchAppointments = useCallback(async () => {
    setApptLoading(true);
    try {
      const params = { page: apptPage, limit: 10 };
      if (apptStatus) params.status = apptStatus;
      const { data } = await getAllAppointments(params);
      setAppointments(data.data);
      setApptPagination(data.pagination);
    } catch { toast.error('Failed to load appointments'); }
    finally { setApptLoading(false); }
  }, [apptPage, apptStatus]);

  const fetchUsers = useCallback(async () => {
    setUserLoading(true);
    try {
      const params = { page: userPage, limit: 10 };
      if (userSearch) params.search = userSearch;
      if (userRole) params.role = userRole;
      const { data } = await getAllUsers(params);
      setUsers(data.data);
      setUserPagination(data.pagination);
    } catch { toast.error('Failed to load users'); }
    finally { setUserLoading(false); }
  }, [userPage, userSearch, userRole]);

  useEffect(() => {
    if (activeTab === 'appointments') fetchAppointments();
  }, [activeTab, fetchAppointments]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [activeTab, fetchUsers]);

  const handleToggleUser = async (user) => {
    try {
      await toggleUserStatus(user._id);
      toast.success(`User ${user.isActive ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">System Activity</h1>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 w-fit">
        {['appointments', 'users'].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${
              activeTab === t ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Appointments tab */}
      {activeTab === 'appointments' && (
        <>
          <div className="card mb-4">
            <div className="flex gap-2 flex-wrap">
              {['', 'pending', 'confirmed', 'completed', 'cancelled', 'rejected'].map((s) => (
                <button
                  key={s}
                  onClick={() => { setApptStatus(s); setApptPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition capitalize ${
                    apptStatus === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s || 'all'}
                </button>
              ))}
            </div>
          </div>

          {apptLoading ? (
            <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
          ) : (
            <div className="card overflow-hidden p-0">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Patient', 'Doctor', 'Date & Time', 'Type', 'Status', 'Fee'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {appointments.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">No appointments</td></tr>
                  ) : appointments.map((a) => (
                    <tr key={a._id} className="hover:bg-gray-50 text-sm">
                      <td className="px-4 py-3 font-medium text-gray-900">{a.patient?.name}</td>
                      <td className="px-4 py-3 text-gray-600">
                        Dr. {formatDoctorName(a.doctor?.user?.name)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(a.appointmentDate)}<br />
                        <span className="text-xs text-gray-400">{a.timeSlot?.startTime}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{a.type}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${getStatusColor(a.status)} capitalize`}>{a.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">${a.fee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination pagination={apptPagination} onPageChange={setApptPage} />
        </>
      )}

      {/* Users tab */}
      {activeTab === 'users' && (
        <>
          <div className="card mb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text" placeholder="Search users..."
                  className="input-field pl-9"
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                />
              </div>
              <select
                className="input-field sm:w-40"
                value={userRole}
                onChange={(e) => { setUserRole(e.target.value); setUserPage(1); }}
              >
                <option value="">All Roles</option>
                <option value="patient">Patients</option>
                <option value="doctor">Doctors</option>
                <option value="admin">Admins</option>
              </select>
            </div>
          </div>

          {userLoading ? (
            <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
          ) : (
            <div className="card overflow-hidden p-0">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['User', 'Role', 'Joined', 'Last Login', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">No users</td></tr>
                  ) : users.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50 text-sm">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge bg-blue-100 text-blue-700 capitalize">{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-600">{u.lastLogin ? formatDate(u.lastLogin) : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleToggleUser(u)}
                            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${
                              u.isActive
                                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                            }`}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination pagination={userPagination} onPageChange={setUserPage} />
        </>
      )}
    </div>
  );
}