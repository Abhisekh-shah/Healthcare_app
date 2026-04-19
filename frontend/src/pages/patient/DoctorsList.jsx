
import { useState, useEffect, useCallback } from 'react';
import { getDoctors, getDoctorSlots } from '../../services/doctorService';
import { bookAppointment } from '../../services/appointmentService';
import { SPECIALIZATIONS, getErrorMessage } from '../../utils/helpers';
import { format, addDays } from 'date-fns';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import { MagnifyingGlassIcon, FunnelIcon, StarIcon, XMarkIcon, CalendarIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function DoctorsList() {
  const [doctors, setDoctors] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ name: '', specialization: '', page: 1 });

  // Booking modal state
  const [booking, setBooking] = useState(null); // { doctor }
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [symptoms, setSymptoms] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getDoctors({
        name: filters.name || undefined,
        specialization: filters.specialization || undefined,
        page: filters.page,
        limit: 9,
      });
      
      // DEBUGGING: Log the complete response
      console.log('=== FULL API RESPONSE ===');
      console.log('Response:', response);
      console.log('Response type:', typeof response);
      console.log('Response keys:', Object.keys(response));
      
      if (response.data) {
        console.log('Response.data:', response.data);
        console.log('Response.data type:', typeof response.data);
        console.log('Response.data keys:', Object.keys(response.data));
        console.log('Is response.data an array?', Array.isArray(response.data));
      }
      
      // Try different ways to extract doctors
      let doctorsData = [];
      let paginationData = null;
      
      // Case 1: response.data is the doctors array
      if (Array.isArray(response.data)) {
        console.log('Case 1: response.data is array');
        doctorsData = response.data;
        paginationData = response.pagination || null;
      }
      // Case 2: response.data has a data property that is array
      else if (response.data && Array.isArray(response.data.data)) {
        console.log('Case 2: response.data.data is array');
        doctorsData = response.data.data;
        paginationData = response.data.pagination || response.pagination || null;
      }
      // Case 3: response itself is the doctors array
      else if (Array.isArray(response)) {
        console.log('Case 3: response is array');
        doctorsData = response;
        paginationData = null;
      }
      // Case 4: response has data property that is object with doctors
      else if (response.data && response.data.doctors && Array.isArray(response.data.doctors)) {
        console.log('Case 4: response.data.doctors is array');
        doctorsData = response.data.doctors;
        paginationData = response.data.pagination || response.pagination || null;
      }
      // Case 5: response has doctors property
      else if (response.doctors && Array.isArray(response.doctors)) {
        console.log('Case 5: response.doctors is array');
        doctorsData = response.doctors;
        paginationData = response.pagination || null;
      }
      
      console.log('Extracted doctors data:', doctorsData);
      console.log('Doctors count:', doctorsData.length);
      console.log('Pagination:', paginationData);
      
      setDoctors(doctorsData);
      setPagination(paginationData);
      
      if (doctorsData.length === 0) {
        console.warn('No doctors found in response!');
      }
    } catch (error) {
      console.error('Fetch doctors error:', error);
      toast.error('Failed to load doctors');
      setDoctors([]);
      setPagination(null);
    }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  const fetchSlots = useCallback(async () => {
    if (!booking) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    try {
      const { data } = await getDoctorSlots(booking.doctor._id, selectedDate);
      setSlots(data.slots || []);
    } catch { setSlots([]); }
    finally { setSlotsLoading(false); }
  }, [booking, selectedDate]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  const handleBook = async () => {
    if (!selectedSlot) return toast.error('Please select a time slot');
    setBookingLoading(true);
    try {
      await bookAppointment({
        doctorId: booking.doctor._id,
        appointmentDate: selectedDate,
        timeSlot: selectedSlot,
        symptoms,
      });
      toast.success('Appointment booked successfully!');
      setBooking(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally { setBookingLoading(false); }
  };

  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(), i + 1);
    return { value: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE, MMM d') };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Find a Doctor</h1>


      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name..."
              className="input-field pl-9"
              value={filters.name}
              onChange={(e) => setFilters({ ...filters, name: e.target.value, page: 1 })}
            />
          </div>
          <div className="relative sm:w-64">
            <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              className="input-field pl-9"
              value={filters.specialization}
              onChange={(e) => setFilters({ ...filters, specialization: e.target.value, page: 1 })}
            >
              <option value="">All Specializations</option>
              {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Doctor grid */}
      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-16">
          <MagnifyingGlassIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No doctors found matching your search</p>
          <button 
            onClick={fetchDoctors}
            className="mt-4 text-blue-600 hover:text-blue-700 text-sm"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {doctors.map((doctor) => (
              <div key={doctor._id} className="card hover:shadow-md transition flex flex-col">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                    {doctor.user?.name?.[0] || 'D'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{doctor.user?.name}</h3>
                    
                    <p className="text-blue-600 text-sm">{doctor.specialization}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <StarIcon className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-xs text-gray-500">
                        {doctor.rating?.average?.toFixed(1) || '0.0'} ({doctor.rating?.count || 0} reviews)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm text-gray-600 flex-1">
                  {doctor.experience > 0 && (
                    <p><span className="font-medium">Experience:</span> {doctor.experience} years</p>
                  )}
                  {doctor.consultationFee > 0 && (
                    <p><span className="font-medium">Fee:</span> {doctor.consultationFee}</p>
                  )}
                  {doctor.hospital?.name && (
                    <p className="truncate"><span className="font-medium">Hospital:</span> {doctor.hospital.name}</p>
                  )}
                </div>

                <button
                  onClick={() => {
                    setBooking({ doctor });
                    setSelectedDate(dateOptions[0].value);
                    setSymptoms('');
                    setSelectedSlot(null);
                  }}
                  disabled={!doctor.isAcceptingAppointments}
                  className={`mt-4 w-full py-2 rounded-lg text-sm font-medium transition ${
                    doctor.isAcceptingAppointments
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {doctor.isAcceptingAppointments ? 'Book Appointment' : 'Not Available'}
                </button>
              </div>
            ))}
          </div>
          
          {pagination && pagination.pages > 1 && (
            <Pagination pagination={pagination} onPageChange={(p) => setFilters({ ...filters, page: p })} />
          )}
        </>
      )}

      {/* Booking Modal */}
      {booking && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Book Appointment</h2>
                <p className="text-sm text-gray-500">Dr. {booking.doctor.user?.name} · {booking.doctor.specialization}</p>
              </div>
              <button onClick={() => setBooking(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Date picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CalendarIcon className="h-4 w-4 inline mr-1" />
                  Select Date
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {dateOptions.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setSelectedDate(d.value)}
                      className={`text-xs py-2 px-1 rounded-lg border-2 transition ${
                        selectedDate === d.value
                          ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time slots */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Time Slot</label>
                {slotsLoading ? (
                  <div className="flex justify-center py-4"><LoadingSpinner /></div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">No slots available for this date</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot.startTime}
                        disabled={slot.isBooked}
                        onClick={() => setSelectedSlot({ startTime: slot.startTime, endTime: slot.endTime })}
                        className={`text-xs py-2 rounded-lg border-2 transition ${
                          slot.isBooked
                            ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                            : selectedSlot?.startTime === slot.startTime
                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                            : 'border-gray-200 hover:border-blue-300 text-gray-700'
                        }`}
                      >
                        {slot.startTime}
                        {slot.isBooked && <span className="block text-gray-300">Booked</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Symptoms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Symptoms (optional)</label>
                <textarea
                  rows={3}
                  className="input-field resize-none"
                  placeholder="Describe your symptoms..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button onClick={() => setBooking(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleBook}
                disabled={!selectedSlot || bookingLoading}
                className="btn-primary flex-1"
              >
                {bookingLoading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Booking...
                  </span>
                ) : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}