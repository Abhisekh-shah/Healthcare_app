import api from './api';

export const bookAppointment = (data) => api.post('/appointments', data);
export const getMyAppointments = (params) => api.get('/appointments/my', { params });
export const cancelAppointment = (id, reason) => api.patch(`/appointments/${id}/cancel`, { reason });
export const getDoctorAppointments = (params) => api.get('/appointments/doctor', { params });
export const updateAppointmentStatus = (id, data) => api.patch(`/appointments/${id}/status`, data);
export const getAppointmentById = (id) => api.get(`/appointments/${id}`);
