import api from './api';

export const getProfile = () => api.get('/patients/profile');
export const updateProfile = (data) => api.put('/patients/profile', data);
export const changePassword = (data) => api.put('/patients/change-password', data);
