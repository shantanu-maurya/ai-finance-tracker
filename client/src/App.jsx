import { useEffect } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { refreshUser } from './slices/authSlice';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budget from './pages/Budget';
import Insights from './pages/Insights';
import Reports from './pages/Reports';
import Profile from './pages/Profile';

const NotFound = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
    <p className="text-5xl font-semibold text-ink">404</p>
    <p className="text-ink-secondary">We could not find that page.</p>
    <Link to="/dashboard" className="btn-primary mt-2">
      Back to dashboard
    </Link>
  </div>
);

export default function App() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  // Re-validate a stored token once on load. If it has expired, the axios
  // interceptor clears the session and routes back to login.
  useEffect(() => {
    if (token) dispatch(refreshUser());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
