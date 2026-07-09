// ============================================================
// CodeQuest — App Router
// ============================================================

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LevelMapPage from './pages/LevelMapPage';
import LessonPage from './pages/LessonPage';
import ProfilePage from './pages/ProfilePage';
import ParentDashboard from './pages/ParentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import LessonManager from './pages/LessonManager';
import UserManager from './pages/UserManager';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <div className="loading-spinner">🚀</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) return <Navigate to="/" />;

  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <div className="loading-spinner">🚀</div>
      </div>
    );
  }

  // Authenticated layout: sidebar + topbar + main content
  if (isAuthenticated) {
    return (
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Navbar />
          <Routes>
            {/* Learner */}
            <Route path="/learn" element={<ProtectedRoute><LevelMapPage /></ProtectedRoute>} />
            <Route path="/lesson/:id" element={<ProtectedRoute><LessonPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

            {/* Parent */}
            <Route path="/parent" element={<ProtectedRoute allowedRoles={['parent']}><ParentDashboard /></ProtectedRoute>} />

            {/* Teacher */}
            <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/lessons" element={<ProtectedRoute allowedRoles={['admin']}><LessonManager /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManager /></ProtectedRoute>} />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/learn" />} />
            <Route path="*" element={<Navigate to="/learn" />} />
          </Routes>
        </div>
      </div>
    );
  }

  // Public layout: no sidebar
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
