import { useState, useEffect, useCallback } from 'react';
import { getDoctorAppointments, updateAppointmentStatus } from '../../services/appointmentService';
import { formatDate, getStatusColor, getErrorMessage } from '../../utils/helpers';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import { CalendarDaysIcon, CheckIcon, XMarkIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [noteModal, setNoteModal] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [prescription, setPrescription] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (dateFilter) params.date = dateFilter;
      const { data } = await getDoctorAppointments(params);
      setAppointments(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load appointments'); }
    finally { setLoading(false); }
  }, [page, statusFilter, dateFilter]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const handleStatusUpdate = async (id, status, notes = '', presc = '') => {
    setUpdating(true);
    try {
      await updateAppointmentStatus(id, { status, notes, prescription: presc });
      toast.success(`Appointment ${status}`);
      setNoteModal(null);
      fetchAppointments();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setUpdating(false); }
  };

  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Appointment Schedule</h1>
        <button
          onClick={() => { setDateFilter(today); setPage(1); }}
          className={`text-sm px-3 py-1.5 rounded-lg border transition ${
            dateFilter === today ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          Today
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2 flex-wrap flex-1">
            {['all', 'pending', 'confirmed', 'completed', 'rejected'].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition ${
                  statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <input
            type="date"
            className="input-field sm:w-40"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : appointments.length === 0 ? (
        <div className="card text-center py-16">
          <ClipboardDocumentListIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No appointments found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => (
            <div key={appt._id} className="card hover:shadow-md transition">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-700 font-bold text-lg flex-shrink-0">
                    {appt.patient?.name?.[0] || 'P'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{appt.patient?.name}</h3>
                    <p className="text-sm text-gray-500">{appt.patient?.email}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      <CalendarDaysIcon className="h-4 w-4 inline mr-1" />
                      {formatDate(appt.appointmentDate)} · {appt.timeSlot?.startTime} – {appt.timeSlot?.endTime}
                    </p>
                    {appt.symptoms && (
                      <p className="text-xs text-gray-400 mt-1 max-w-sm">Symptoms: {appt.symptoms}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-2">
                  <span className={`badge ${getStatusColor(appt.status)} capitalize`}>{appt.status}</span>
                  <span className="text-xs text-gray-400 capitalize">{appt.type}</span>

                  {appt.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStatusUpdate(appt._id, 'confirmed')}
                        disabled={updating}
                        className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition"
                      >
                        <CheckIcon className="h-3.5 w-3.5" /> Accept
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(appt._id, 'rejected')}
                        disabled={updating}
                        className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition"
                      >
                        <XMarkIcon className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  )}
                  {appt.status === 'confirmed' && (
                    <button
                      onClick={() => { setNoteModal(appt); setNoteText(''); setPrescription(''); }}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition"
                    >
                      Complete & Add Notes
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination pagination={pagination} onPageChange={setPage} />

      {/* Complete appointment modal */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Complete Appointment</h3>
              <button onClick={() => setNoteModal(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Patient: <strong>{noteModal.patient?.name}</strong>
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Doctor Notes</label>
                <textarea
                  rows={3}
                  className="input-field resize-none"
                  placeholder="Consultation notes..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Prescription (optional)</label>
                <textarea
                  rows={3}
                  className="input-field resize-none"
                  placeholder="Medication, dosage..."
                  value={prescription}
                  onChange={(e) => setPrescription(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setNoteModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => handleStatusUpdate(noteModal._id, 'completed', noteText, prescription)}
                disabled={updating}
                className="btn-primary flex-1"
              >
                {updating ? 'Saving...' : 'Mark Complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
