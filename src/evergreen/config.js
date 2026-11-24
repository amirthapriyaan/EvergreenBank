// Add your Firebase Web API key and project ID from Firebase Console.
export const FIREBASE_API_KEY = import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCBFNuaxwIPieQs7BQfb4Vg5k3VyT2ICTo';
export const FIREBASE_PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'evergreen-2b12e';
export const BANK_ID = 'P675';
export const BANK_NAME = 'Evergreen Bank';
export const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
export const SWITCH_BASE = import.meta.env.VITE_X42_API_URL || 'https://sharedbank-switch.e-commerce-sriramtpsiog.workers.dev';
