
import { useState, useEffect, useCallback } from 'react';
import { getAllDoctorsForAdmin, createDoctor, updateDoctor, deleteDoctor, verifyDoctor } from '../../services/adminService';
import { SPECIALIZATIONS, getErrorMessage } from '../../utils/helpers';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon, MagnifyingGlassIcon, CheckIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const emptyForm = {
  name: '', email: '', password: '', phone: '',
  specialization: '', experience: 0, consultationFee: 0,
  bio: '', hospital: { name: '', address: '' },
};

const formatDoctorName = (name) => {
  if (!name) return 'Unknown';
  let cleanName = name.replace(/^Dr\.\s*/i, '');
  return cleanName;
};

export default function ManageDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [specFilter, setSpecFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10
      };
      
      if (search) params.search = search;
      if (specFilter) params.specialization = specFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      
      const response = await getAllDoctorsForAdmin(params);
      setDoctors(response.data.data || []);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Failed to load doctors');
    } finally { 
      setLoading(false); 
    }
  }, [search, specFilter, statusFilter, page]);

  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  const openCreate = () => { setForm(emptyForm); setModal('create'); };
  
  const openEdit = (doctor) => {
    setForm({
      name: formatDoctorName(doctor.user?.name) || '',
      email: doctor.user?.email || '',
      password: '',
      phone: doctor.user?.phone || '',
      specialization: doctor.specialization || '',
      experience: doctor.experience || 0,
      consultationFee: doctor.consultationFee || 0,
      bio: doctor.bio || '',
      hospital: doctor.hospital || { name: '', address: '' },
    });
    setModal(doctor);
  };

  const handleAccept = async (doctor) => {
    try {
      await verifyDoctor(doctor._id, true);
      toast.success(`Dr. ${formatDoctorName(doctor.user?.name)} has been accepted`);
      fetchDoctors();
    } catch (err) { 
      toast.error(getErrorMessage(err)); 
    }
  };

  const handleReject = async (doctor) => {
    try {
      await verifyDoctor(doctor._id, false);
      toast.success(`Dr. ${formatDoctorName(doctor.user?.name)} has been rejected`);
      fetchDoctors();
    } catch (err) { 
      toast.error(getErrorMessage(err)); 
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === 'create') {
        await createDoctor(form);
        toast.success('Doctor created successfully');
      } else {
        const { name, email, password, phone, ...rest } = form;
        await updateDoctor(modal._id, rest);
        toast.success('Doctor updated successfully');
      }
      setModal(null);
      fetchDoctors();
    } catch (err) { 
      toast.error(getErrorMessage(err)); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoctor(deleteConfirm._id);
      toast.success('Doctor removed successfully');
      setDeleteConfirm(null);
      fetchDoctors();
    } catch (err) { 
      toast.error(getErrorMessage(err)); 
    }
  };

  const getStatusBadge = (doctor) => {
    if (doctor.isVerified && !doctor.isRejected) {
      return {
        text: 'Accepted',
        className: 'bg-green-100 text-green-700',
        icon: <CheckIcon className="h-3 w-3 inline mr-1" />
      };
    } else if (doctor.isRejected) {
      return {
        text: 'Rejected',
        className: 'bg-red-100 text-red-700',
        icon: <XCircleIcon className="h-3 w-3 inline mr-1" />
      };
    } else {
      return {
        text: 'Pending',
        className: 'bg-yellow-100 text-yellow-700',
        icon: <ClockIcon className="h-3 w-3 inline mr-1" />
      };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Doctors</h1>
        <button onClick={openCreate} className="btn-primary gap-1.5">
          <PlusIcon className="h-4 w-4" /> Add Doctor
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text" 
              placeholder="Search by name or email..."
              className="input-field pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="input-field sm:w-56"
            value={specFilter}
            onChange={(e) => { setSpecFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Specializations</option>
            {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            className="input-field sm:w-48"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="all">All Status</option>
            <option value="accepted">Accepted</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Doctor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Specialization</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Experience</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {doctors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      No doctors found
                    </td>
                  </tr>
                ) : (
                  doctors.map((d) => {
                    const status = getStatusBadge(d);
                    return (
                      <tr key={d._id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-sm font-bold">
                              {d.user?.name?.[0] || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                Dr. {formatDoctorName(d.user?.name)}
                              </p>
                              <p className="text-xs text-gray-400">{d.user?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{d.specialization || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{d.experience || 0} yrs</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{d.consultationFee || 0}</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${status.className}`}>
                            {status.icon}
                            {status.text}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {!d.isVerified && !d.isRejected && (
                              <>
                                <button 
                                  onClick={() => handleAccept(d)} 
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                                  title="Accept Doctor"
                                >
                                  <CheckIcon className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => handleReject(d)} 
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                  title="Reject Doctor"
                                >
                                  <XCircleIcon className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            
                            {d.isVerified && !d.isRejected && (
                              <button 
                                onClick={() => handleReject(d)} 
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Reject Doctor"
                              >
                                <XCircleIcon className="h-4 w-4" />
                              </button>
                            )}
                            
                            {d.isRejected && (
                              <button 
                                onClick={() => handleAccept(d)} 
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                                title="Re-accept Doctor"
                              >
                                <CheckIcon className="h-4 w-4" />
                              </button>
                            )}
                            
                            {/* <button 
                              onClick={() => openEdit(d)} 
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Edit Doctor"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button> */}
                            <button 
                              onClick={() => setDeleteConfirm(d)} 
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete Doctor"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <Pagination pagination={pagination} onPageChange={setPage} />
      )}

      {/* Create/Edit Modal - Keep your existing modal code */}
      {/* Delete Confirmation Modal - Keep your existing delete modal code */}
    </div>
  );
}