import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Spinner from './Spinner';

/**
 * Gate for every authenticated route.
 *
 * While `initialising` is true the stored token is still being re-validated,
 * so we hold on a spinner. Redirecting during that window would bounce a
 * perfectly valid session straight to the login page on every refresh.
 */
export default function ProtectedRoute() {
  const { token, initialising } = useSelector((state) => state.auth);
  const location = useLocation();

  if (initialising) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Restoring your session" />
      </div>
    );
  }

  if (!token) {
    // `state.from` lets the login page send the user back where they were headed.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
