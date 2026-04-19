

import { useState, useEffect } from 'react';
import { updateDoctorProfile, updateAvailability } from '../../services/doctorService';
import { SPECIALIZATIONS, DAYS_OF_WEEK, getErrorMessage } from '../../utils/helpers';
import { PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function DoctorProfile() {
  const [doctorData, setDoctorData] = useState(null);
  const [tab, setTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    specialization: '', 
    experience: '', 
    consultationFee: '',
    bio: '', 
    hospital: { name: '', address: '' }, 
    isAcceptingAppointments: true,
    qualifications: [],
  });
  const [newQual, setNewQual] = useState('');
  const [availability, setAvailability] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/auth/me');
        if (data.doctorProfile) {
          const d = data.doctorProfile;
          console.log('Fetched doctor data:', d);
          console.log('Qualifications from DB:', d.qualifications);
          
          setDoctorData(d);
          setForm({
            specialization: d.specialization || '',
            experience: d.experience?.toString() || '',
            consultationFee: d.consultationFee?.toString() || '',
            bio: d.bio || '',
            hospital: d.hospital || { name: '', address: '' },
            isAcceptingAppointments: d.isAcceptingAppointments ?? true,
            qualifications: d.qualifications || [], 
          });
          setAvailability(d.availability || []);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      }
    };
    fetch();
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Prepare the data - ensure qualifications is always an array
      const formData = {
        specialization: form.specialization,
        experience: form.experience === '' ? 0 : Number(form.experience),
        consultationFee: form.consultationFee === '' ? 0 : Number(form.consultationFee),
        bio: form.bio,
        hospital: {
          name: form.hospital.name || '',
          address: form.hospital.address || ''
        },
        isAcceptingAppointments: form.isAcceptingAppointments,
        qualifications: Array.isArray(form.qualifications) ? form.qualifications : [] // Ensure it's an array
      };
      
      console.log('Sending to backend:', JSON.stringify(formData, null, 2));
      console.log('Qualifications being sent:', formData.qualifications);
      console.log('Qualifications length:', formData.qualifications.length);
      
      const response = await updateDoctorProfile(formData);
      console.log('Server response:', response.data);
      
      if (response.data.success && response.data.doctor) {
        setDoctorData(response.data.doctor);
        
        // Update form with returned data
        setForm({
          specialization: response.data.doctor.specialization || '',
          experience: response.data.doctor.experience?.toString() || '',
          consultationFee: response.data.doctor.consultationFee?.toString() || '',
          bio: response.data.doctor.bio || '',
          hospital: response.data.doctor.hospital || { name: '', address: '' },
          isAcceptingAppointments: response.data.doctor.isAcceptingAppointments ?? true,
          qualifications: response.data.doctor.qualifications || [],
        });
        
        toast.success('Profile updated successfully');
      } else {
        toast.error('Failed to update profile');
      }
    } catch (err) { 
      console.error('Save error:', err);
      console.error('Error response:', err.response?.data);
      toast.error(getErrorMessage(err)); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleAvailabilitySave = async () => {
    setSaving(true);
    try {
      await updateAvailability(availability);
      toast.success('Availability updated');
    } catch (err) { 
      console.error('Availability save error:', err);
      toast.error(getErrorMessage(err)); 
    } finally { 
      setSaving(false); 
    }
  };

  const addDay = () => {
    const used = new Set(availability.map((a) => a.day));
    const next = DAYS_OF_WEEK.find((d) => !used.has(d));
    if (!next) return toast.error('All days already added');
    setAvailability([...availability, { 
      day: next, 
      startTime: '09:00', 
      endTime: '17:00', 
      slotDuration: 30, 
      isAvailable: true 
    }]);
  };

  const updateDay = (i, field, value) => {
    setAvailability(availability.map((a, idx) => idx === i ? { ...a, [field]: value } : a));
  };

  const removeDay = (i) => setAvailability(availability.filter((_, idx) => idx !== i));

  if (!doctorData) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin h-8 w-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Doctor Profile</h1>

      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 w-fit">
        {['profile', 'availability'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${
              tab === t ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'profile' ? (
        <div className="card">
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                <select
                  className="input-field"
                  value={form.specialization}
                  onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                  required
                >
                  <option value="">Select Specialization</option>
                  {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Experience (years)</label>
                <input
                  type="number" 
                  min="0"
                  className="input-field"
                  value={form.experience}
                  onChange={(e) => setForm({ ...form, experience: e.target.value })}
                  placeholder="Enter years of experience"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Fee </label>
                <input
                  type="number" 
                  min="0"
                  className="input-field"
                  value={form.consultationFee}
                  onChange={(e) => setForm({ ...form, consultationFee: e.target.value })}
                  placeholder="Enter consultation fee"
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox" id="accepting"
                  className="w-4 h-4 text-blue-600"
                  checked={form.isAcceptingAppointments}
                  onChange={(e) => setForm({ ...form, isAcceptingAppointments: e.target.checked })}
                />
                <label htmlFor="accepting" className="text-sm font-medium text-gray-700">
                  Accepting Appointments
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                rows={3} 
                className="input-field resize-none"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Tell patients about yourself..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Name</label>
                <input
                  type="text" 
                  className="input-field"
                  value={form.hospital?.name || ''}
                  onChange={(e) => setForm({ ...form, hospital: { ...form.hospital, name: e.target.value } })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Address</label>
                <input
                  type="text" 
                  className="input-field"
                  value={form.hospital?.address || ''}
                  onChange={(e) => setForm({ ...form, hospital: { ...form.hospital, address: e.target.value } })}
                />
              </div>
            </div>

            {/* Qualifications */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Qualifications</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.qualifications && form.qualifications.map((q, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm">
                    {q}
                    <button 
                      type="button" 
                      onClick={() => {
                        const newQualifications = form.qualifications.filter((_, idx) => idx !== i);
                        setForm({ ...form, qualifications: newQualifications });
                      }}
                    >
                      <XMarkIcon className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text" 
                  className="input-field"
                  placeholder="e.g. MBBS, MD Radiology"
                  value={newQual}
                  onChange={(e) => setNewQual(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newQual.trim()) {
                        setForm({ 
                          ...form, 
                          qualifications: [...(form.qualifications || []), newQual.trim()] 
                        });
                        setNewQual('');
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newQual.trim()) {
                      setForm({ 
                        ...form, 
                        qualifications: [...(form.qualifications || []), newQual.trim()] 
                      });
                      setNewQual('');
                    }
                  }}
                  className="btn-secondary px-3"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {form.qualifications?.length || 0} qualification(s) added
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Weekly Availability</h2>
            <button onClick={addDay} className="btn-secondary text-sm gap-1">
              <PlusIcon className="h-4 w-4" /> Add Day
            </button>
          </div>

          {availability.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              No availability set. Add days to start accepting appointments.
            </p>
          ) : (
            <div className="space-y-3">
              {availability.map((slot, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <select
                    className="input-field w-32 capitalize"
                    value={slot.day}
                    onChange={(e) => updateDay(i, 'day', e.target.value)}
                  >
                    {DAYS_OF_WEEK.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <input 
                    type="time" 
                    className="input-field w-28" 
                    value={slot.startTime}
                    onChange={(e) => updateDay(i, 'startTime', e.target.value)} 
                  />
                  <span className="text-gray-400 text-sm">to</span>
                  <input 
                    type="time" 
                    className="input-field w-28" 
                    value={slot.endTime}
                    onChange={(e) => updateDay(i, 'endTime', e.target.value)} 
                  />
                  <select 
                    className="input-field w-28" 
                    value={slot.slotDuration}
                    onChange={(e) => updateDay(i, 'slotDuration', +e.target.value)}
                  >
                    {[15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
                  </select>
                  <label className="flex items-center gap-1 text-sm">
                    <input 
                      type="checkbox" 
                      checked={slot.isAvailable}
                      onChange={(e) => updateDay(i, 'isAvailable', e.target.checked)}
                      className="w-4 h-4" 
                    />
                    Available
                  </label>
                  <button 
                    type="button"
                    onClick={() => removeDay(i)} 
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end mt-4">
            <button onClick={handleAvailabilitySave} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Availability'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}