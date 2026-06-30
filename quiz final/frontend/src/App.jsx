import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EventFormPage from './pages/EventFormPage';
import EventDetailPage from './pages/EventDetailPage';
import QuestionManagePage from './pages/QuestionManagePage';
import TeamRegisterPage from './pages/TeamRegisterPage';
import QuizDashboardPage from './pages/QuizDashboardPage';
import ResultsPage from './pages/ResultsPage';
import RulesPage from './pages/RulesPage';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl text-gray-400">Loading...</div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/rules" element={<RulesPage />} />
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <DashboardPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/events/new"
                element={
                    <ProtectedRoute>
                        <EventFormPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/events/:id/edit"
                element={
                    <ProtectedRoute>
                        <EventFormPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/events/:id"
                element={
                    <ProtectedRoute>
                        <EventDetailPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/events/:id/questions"
                element={
                    <ProtectedRoute>
                        <QuestionManagePage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/events/:id/teams"
                element={
                    <ProtectedRoute>
                        <TeamRegisterPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/events/:id/quiz"
                element={
                    <ProtectedRoute>
                        <QuizDashboardPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/events/:id/results"
                element={
                    <ProtectedRoute>
                        <ResultsPage />
                    </ProtectedRoute>
                }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}