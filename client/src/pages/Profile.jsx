import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  updateProfile,
  changePassword,
  fetchAccountStats,
  clearAuthFeedback
} from '../slices/authSlice';

import PageHeader from '../components/PageHeader';
import SummaryCard from '../components/SummaryCard';
import Alert from '../components/Alert';
import { formatCurrency, formatDate } from '../utils/format';
import { seriesColors } from '../utils/chartTheme';

export default function Profile() {
  const dispatch = useDispatch();
  const { user, stats, loading, error, message } = useSelector((state) => state.auth);

  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState(null);

  useEffect(() => {
    dispatch(fetchAccountStats());
    return () => {
      dispatch(clearAuthFeedback());
    };
  }, [dispatch]);

  useEffect(() => {
    if (user) setProfileForm({ name: user.name || '', email: user.email || '' });
  }, [user]);

  const handleProfileSubmit = (event) => {
    event.preventDefault();
    dispatch(clearAuthFeedback());
    dispatch(updateProfile(profileForm));
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    dispatch(clearAuthFeedback());

    if (passwordForm.newPassword.length < 6) {
      return setPasswordError('New password must be at least 6 characters.');
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return setPasswordError('New passwords do not match.');
    }

    setPasswordError(null);

    const result = await dispatch(
      changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      })
    );

    if (changePassword.fulfilled.match(result)) {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
    return undefined;
  };

  return (
    <>
      <PageHeader
        title="Profile"
        subtitle={stats?.memberSince ? `Member since ${formatDate(stats.memberSince)}` : 'Your account'}
      />

      {error && <Alert tone="error" className="mb-4" onDismiss={() => dispatch(clearAuthFeedback())}>{error}</Alert>}
      {message && <Alert tone="success" className="mb-4" onDismiss={() => dispatch(clearAuthFeedback())}>{message}</Alert>}

      {/* These figures come from the same summarizeTransactions() call that
          powers the Dashboard, so the two pages can never disagree. */}
      {stats && (
        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Transactions"
            value={stats.transactionCount}
            footnote={`${stats.incomeCount} income · ${stats.expenseCount} expense`}
          />
          <SummaryCard
            label="Total income"
            value={formatCurrency(stats.totalIncome)}
            accent={seriesColors.income}
          />
          <SummaryCard
            label="Total expense"
            value={formatCurrency(stats.totalExpense)}
            footnote={`Across ${stats.categoriesUsed} categories`}
            accent={seriesColors.expense}
          />
          <SummaryCard
            label="Net savings"
            value={formatCurrency(stats.savings)}
            footnote={`${stats.savingsRate}% savings rate`}
            accent={seriesColors.savings}
            tone={stats.savings >= 0 ? 'positive' : 'negative'}
          />
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={handleProfileSubmit} className="card space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-ink">Account details</h2>
            <p className="text-xs text-ink-muted">Update your name or email address.</p>
          </div>

          <div>
            <label className="label" htmlFor="profile-name">Name</label>
            <input
              id="profile-name"
              value={profileForm.name}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
              className="input"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="profile-email">Email</label>
            <input
              id="profile-email"
              type="email"
              value={profileForm.email}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
              className="input"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Saving…' : 'Save changes'}
          </button>
        </form>

        <form onSubmit={handlePasswordSubmit} className="card space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-ink">Change password</h2>
            <p className="text-xs text-ink-muted">You will stay signed in on this device.</p>
          </div>

          {passwordError && <Alert tone="error">{passwordError}</Alert>}

          <div>
            <label className="label" htmlFor="currentPassword">Current password</label>
            <input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={passwordForm.currentPassword}
              onChange={(event) =>
                setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
              }
              className="input"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="newPassword">New password</label>
              <input
                id="newPassword"
                type="password"
                minLength={6}
                autoComplete="new-password"
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                }
                className="input"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="confirmNewPassword">Confirm</label>
              <input
                id="confirmNewPassword"
                type="password"
                autoComplete="new-password"
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                }
                className="input"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </>
  );
}
