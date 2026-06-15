/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useEffect, useState } from 'react';
import AuthScreen from './components/AuthScreen';
import AppShell from './components/ui/AppShell';
import { ToastProvider } from './components/ui/Toast';
import {
  clearAuthSession,
  getStoredUser,
  sanitizeUser,
  setAuthSession,
  type SafeUserProfile,
} from './lib/auth';
import { logoutUser } from './lib/apiServices';
import type { AppLanguage } from './lib/lang';
import type { UserProfile } from './types';

const DoctorDashboard = lazy(() => import('./components/DoctorDashboard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const PatientPortal = lazy(() => import('./components/patient/PatientPortal'));

function LoadingScreen() {
  return (
    <AppShell className="ios-loading">
      <div className="ios-loading-ring" />
      <p className="text-sm font-semibold tracking-wide ios-header-muted">Yuklanmoqda...</p>
    </AppShell>
  );
}

function AppRouter() {
  const [language, setLanguage] = useState<AppLanguage>(() => {
    const saved = localStorage.getItem('soglik_language');
    return saved === 'kirill' ? 'kirill' : 'lotin';
  });

  const [currentUser, setCurrentUser] = useState<SafeUserProfile | null>(() =>
    getStoredUser()
  );
  useEffect(() => {
    localStorage.setItem('soglik_language', language);
  }, [language]);

  useEffect(() => {
    const onExpired = () => setCurrentUser(null);
    window.addEventListener('soglik:auth-expired', onExpired);
    return () => window.removeEventListener('soglik:auth-expired', onExpired);
  }, []);

  const handleAuthSuccess = (user: UserProfile, token: string) => {
    setAuthSession(token, user);
    setCurrentUser(sanitizeUser(user));
  };

  const handleLogout = () => {
    logoutUser().catch(() => {});
    clearAuthSession();
    localStorage.removeItem('soglik_skrining_tarixi');
    localStorage.removeItem('soglik_kundaligi');
    localStorage.removeItem('soglik_dori_reminders');
    setCurrentUser(null);
  };

  if (!currentUser) {
    return (
      <AuthScreen
        onAuthSuccess={handleAuthSuccess}
        language={language}
        onLanguageChange={setLanguage}
      />
    );
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      {currentUser.rol === 'shifokor' ? (
        <DoctorDashboard
          doctorUser={currentUser}
          onLogout={handleLogout}
          language={language}
          onLanguageChange={setLanguage}
        />
      ) : currentUser.rol === 'admin' ? (
        <AdminDashboard
          adminUser={currentUser}
          onLogout={handleLogout}
          language={language}
          onLanguageChange={setLanguage}
        />
      ) : (
        <PatientPortal
          user={currentUser}
          onLogout={handleLogout}
          language={language}
          onLanguageChange={setLanguage}
        />
      )}
    </Suspense>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppRouter />
    </ToastProvider>
  );
}
