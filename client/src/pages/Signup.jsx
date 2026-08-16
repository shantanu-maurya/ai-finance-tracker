import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { signup, clearAuthFeedback } from '../slices/authSlice';
import Alert from '../components/Alert';

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [localError, setLocalError] = useState(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token, loading, error } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(clearAuthFeedback());
  }, [dispatch]);

  if (token) return <Navigate to="/dashboard" replace />;

  const handleChange = (event) =>
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (form.password.length < 6) {
      return setLocalError('Password must be at least 6 characters.');
    }
    if (form.password !== form.confirmPassword) {
      return setLocalError('Passwords do not match.');
    }

    setLocalError(null);

    const result = await dispatch(
      signup({ name: form.name, email: form.email, password: form.password })
    );

    if (signup.fulfilled.match(result)) navigate('/dashboard', { replace: true });
    return undefined;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-plane px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-500 text-lg font-bold text-white">
            ₹
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Create your account</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Track spending, set budgets, and get a forecast — in a few minutes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {(localError || error) && <Alert tone="error">{localError || error}</Alert>}

          <div>
            <label className="label" htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              required
              autoComplete="name"
              value={form.name}
              onChange={handleChange}
              className="input"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              className="input"
              placeholder="you@example.com"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
                className="input"
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label className="label" htmlFor="confirmPassword">Confirm</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={handleChange}
                className="input"
                placeholder="Repeat password"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          <p className="text-center text-sm text-ink-secondary">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
