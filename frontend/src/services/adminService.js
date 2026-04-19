import api from './api';

export const getDashboardStats = () => api.get('/admin/dashboard');
export const getAllUsers = (params) => api.get('/admin/users', { params });
export const toggleUserStatus = (id) => api.patch(`/admin/users/${id}/toggle-status`);
export const getAllDoctorsForAdmin = (params) => api.get('/admin/doctors', { params });
export const createDoctor = (data) => api.post('/admin/doctors', data);
export const updateDoctor = (id, data) => api.put(`/admin/doctors/${id}`, data);
export const deleteDoctor = (id) => api.delete(`/admin/doctors/${id}`);
export const getAllAppointments = (params) => api.get('/admin/appointments', { params });
export const verifyDoctor = (id, verified) => api.put(`/admin/doctors/${id}/verify`, { verified });