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
import AmbientBackground from './components/AmbientBackground';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <div className="loading-spinner">🚀</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) return <Navigate to={getDefaultRoute(user.role)} />;

  return <>{children}</>;
}

// Role-aware default route
function getDefaultRoute(role: string): string {
  switch (role) {
    case 'learner': return '/learn';
    case 'parent': return '/parent';
    case 'teacher': return '/teacher';
    case 'admin': return '/admin';
    default: return '/learn';
  }
}

function DefaultRedirect() {
  const { user } = useAuth();
  return <Navigate to={getDefaultRoute(user?.role || 'learner')} />;
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
        <AmbientBackground />
        <Sidebar />
        <div className="main-content" style={{ position: 'relative', zIndex: 1 }}>
          <Navbar />
          <Routes>
            {/* Learner only — non-learners cannot take tasks */}
            <Route path="/learn" element={<ProtectedRoute allowedRoles={['learner']}><LevelMapPage /></ProtectedRoute>} />
            <Route path="/lesson/:id" element={<ProtectedRoute allowedRoles={['learner']}><LessonPage /></ProtectedRoute>} />

            {/* Shared */}
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

            {/* Parent — monitoring only */}
            <Route path="/parent" element={<ProtectedRoute allowedRoles={['parent']}><ParentDashboard /></ProtectedRoute>} />

            {/* Teacher — monitoring only */}
            <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/lessons" element={<ProtectedRoute allowedRoles={['admin']}><LessonManager /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManager /></ProtectedRoute>} />

            {/* Role-aware default redirect */}
            <Route path="/" element={<DefaultRedirect />} />
            <Route path="*" element={<DefaultRedirect />} />
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
