import { Navigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

// WHY ProtectedRoute?
// Some pages (Dashboard) should only be visible when logged in
// Wrap any page with this component — if no token, redirect to login automatically
export default function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}