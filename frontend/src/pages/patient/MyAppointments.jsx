
import { useState, useEffect, useCallback } from 'react';
import { getMyAppointments, cancelAppointment } from '../../services/appointmentService';
import { formatDate, getStatusColor, getErrorMessage } from '../../utils/helpers';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import { CalendarDaysIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['all', 'pending', 'confirmed', 'completed', 'cancelled', 'rejected'];

// Helper function to format doctor name without duplicate "Dr."
const formatDoctorName = (name) => {
  if (!name) return 'Doctor';
  // Remove any existing "Dr." prefix
  let cleanName = name.replace(/^Dr\.\s*/i, '');
  return cleanName;
};

export default function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 8 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const { data } = await getMyAppointments(params);
      setAppointments(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load appointments'); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelAppointment(cancelModal._id, cancelReason);
      toast.success('Appointment cancelled');
      setCancelModal(null);
      fetchAppointments();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally { setCancelling(false); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Appointments</h1>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition capitalize ${
              statusFilter === s
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : appointments.length === 0 ? (
        <div className="card text-center py-16">
          <CalendarDaysIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No appointments found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => (
            <div key={appt._id} className="card hover:shadow-md transition">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-700 font-bold text-lg flex-shrink-0">
                    {appt.doctor?.user?.name?.[0] || 'D'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Dr. {formatDoctorName(appt.doctor?.user?.name)}
                    </h3>
                    <p className="text-sm text-blue-600">{appt.doctor?.specialization}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(appt.appointmentDate)} · {appt.timeSlot?.startTime} – {appt.timeSlot?.endTime}
                    </p>
                    {appt.symptoms && (
                      <p className="text-xs text-gray-400 mt-1">Symptoms: {appt.symptoms}</p>
                    )}
                    {appt.notes && (
                      <p className="text-xs text-gray-400 mt-1">Doctor notes: {appt.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-2">
                  <span className={`badge ${getStatusColor(appt.status)} capitalize`}>{appt.status}</span>
                  <span className="text-xs text-gray-400 capitalize">{appt.type}</span>
                  {appt.fee > 0 && <span className="text-sm font-medium text-gray-700">{appt.fee}</span>}
                  {['pending', 'confirmed'].includes(appt.status) && (
                    <button
                      onClick={() => { setCancelModal(appt); setCancelReason(''); }}
                      className="text-xs text-red-600 hover:text-red-700 hover:underline"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination pagination={pagination} onPageChange={setPage} />

      {/* Cancel modal */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Cancel Appointment</h3>
              <button onClick={() => setCancelModal(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Cancel your appointment with Dr. <strong>{formatDoctorName(cancelModal.doctor?.user?.name)}</strong> on{' '}
              <strong>{formatDate(cancelModal.appointmentDate)}</strong>?
            </p>
            <textarea
              rows={3}
              className="input-field mb-4 resize-none"
              placeholder="Reason for cancellation (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => setCancelModal(null)} className="btn-secondary flex-1">Keep it</button>
              <button onClick={handleCancel} disabled={cancelling} className="btn-danger flex-1">
                {cancelling ? 'Cancelling...' : 'Cancel Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}