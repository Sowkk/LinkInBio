import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import PublicPage from "./pages/PublicPage";
import ProtectedRoute from "./components/ProtectedRoute";

// WHY BrowserRouter? Enables React Router — gives us /login, /dashboard etc as real pages
// WHY Navigate to /login as default? If someone visits /, redirect them to login

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<Navigate to="/login" replace />} />
        <Route path="/login"     element={<Login />} />
        <Route path="/register"  element={<Register />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        } />
        <Route path="/:username" element={<PublicPage />} />
      </Routes>
    </BrowserRouter>
  );
}