import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { events } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
    const [eventList, setEventList] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        try {
            const data = await events.list();
            setEventList(data);
        } catch (err) {
            console.error('Failed to load events:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const getStatusBadge = (status) => {
        const colors = {
            setup: 'bg-gray-100 text-gray-700',
            in_progress: 'bg-blue-100 text-blue-700',
            completed: 'bg-green-100 text-green-700',
        };
        const labels = {
            setup: 'Setup',
            in_progress: 'In Progress',
            completed: 'Completed',
        };
        return (
            <span className={`badge ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
                {labels[status] || status}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl text-gray-400">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🎯</span>
                        <h1 className="text-xl font-bold text-gray-900">Quiz Manual Mode</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">{user?.username}</span>
                        <button onClick={handleLogout} className="btn-secondary text-sm py-2 px-4">
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Events</h2>
                        <p className="text-gray-500 mt-1">Manage your quiz competitions</p>
                    </div>
                    <Link to="/events/new" className="btn-primary">
                        + Create Event
                    </Link>
                </div>

                {eventList.length === 0 ? (
                    <div className="card text-center py-16">
                        <div className="text-6xl mb-4">📋</div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Events Yet</h3>
                        <p className="text-gray-500 mb-6">Create your first quiz competition event</p>
                        <Link to="/events/new" className="btn-primary">
                            Create Event
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {eventList.map((event) => (
                            <Link
                                key={event.id}
                                to={`/events/${event.id}`}
                                className="card hover:shadow-md transition-shadow cursor-pointer block"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-semibold text-gray-900">{event.name}</h3>
                                            {getStatusBadge(event.status)}
                                        </div>
                                        {event.description && (
                                            <p className="text-gray-500 mb-3">{event.description}</p>
                                        )}
                                        <div className="flex items-center gap-6 text-sm text-gray-500">
                                            <span>📅 {event.date}</span>
                                            <span>📝 {event.total_questions || 0} Questions</span>
                                            <span>👥 {event.total_teams || 0} Teams</span>
                                        </div>
                                    </div>
                                    <div className="text-gray-400 text-xl ml-4">→</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}