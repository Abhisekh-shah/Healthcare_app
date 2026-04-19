import api from './api';

export const getDoctors = (params) => api.get('/doctors', { params });
export const getDoctorById = (id) => api.get(`/doctors/${id}`);
export const getDoctorSlots = (id, date) => api.get(`/doctors/${id}/slots`, { params: { date } });
export const updateDoctorProfile = (data) => api.put('/doctors/profile', data);
export const updateAvailability = (availability) => api.put('/doctors/availability', { availability });
