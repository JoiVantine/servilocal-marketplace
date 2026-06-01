import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export const ADMIN_EMAIL = 'joi.vantine@gmail.com';

export default function AdminRoute() {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    base44.auth
      .me()
      .then((u) => {
        const isAdmin = u?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        setStatus(isAdmin ? 'ok' : 'denied');
      })
      .catch(() => setStatus('denied'));
  }, []);

  if (status === 'loading') {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (status === 'denied') {
    window.location.href = '/admin/login';
    return null;
  }

  return <Outlet />;
}