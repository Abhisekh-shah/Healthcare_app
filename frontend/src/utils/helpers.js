import { format, parseISO, isValid } from 'date-fns';

export const formatDate = (date, fmt = 'MMM dd, yyyy') => {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, fmt) : '—';
};

export const formatDateTime = (date) => formatDate(date, 'MMM dd, yyyy • hh:mm a');

export const getStatusColor = (status) => {
  const map = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
    completed: 'bg-blue-100 text-blue-800',
  };
  return map[status] || 'bg-gray-100 text-gray-600';
};

export const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Something went wrong';

export const SPECIALIZATIONS = [
  'Cardiologist', 'Dermatologist', 'Endocrinologist', 'Gastroenterologist',
  'General Practitioner', 'Gynecologist', 'Neurologist', 'Oncologist',
  'Ophthalmologist', 'Orthopedist', 'Pediatrician', 'Psychiatrist',
  'Pulmonologist', 'Radiologist', 'Urologist',
];

export const DAYS_OF_WEEK = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];
