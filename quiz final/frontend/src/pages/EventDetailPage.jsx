import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { events, questions as questionsApi, teams as teamsApi, quiz } from '../api/client';

export default function EventDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [questionList, setQuestionList] = useState([]);
    const [teamList, setTeamList] = useState([]);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadEventData();
    }, [id]);

    const loadEventData = async () => {
        try {
            const [eventData, questionData, teamData] = await Promise.all([
                events.get(id),
                questionsApi.list(id),
                teamsApi.list(id),
            ]);
            setEvent(eventData);
            setQuestionList(questionData);
            setTeamList(teamData);
        } catch (err) {
            console.error('Failed to load event:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleStartQuiz = async () => {
        if (actionLoading) return;
        setActionLoading(true);

        // If event is already in progress, navigate directly to quiz (resume)
        if (event?.status === 'in_progress') {
            navigate(`/events/${id}/quiz`);
            return;
        }

        // If event is completed, navigate to results
        if (event?.status === 'completed') {
            navigate(`/events/${id}/results`);
            return;
        }

        // Otherwise start a new game
        if (teamList.length === 0) {
            alert('Please register at least one team before starting.');
            setActionLoading(false);
            return;
        }
        if (questionList.length === 0) {
            alert('Please add at least one question before starting.');
            setActionLoading(false);
            return;
        }
        try {
            await quiz.start(id);
            navigate(`/events/${id}/quiz`);
        } catch (err) {
            if (err.message && err.message.includes('already in progress')) {
                // Resume instead
                navigate(`/events/${id}/quiz`);
            } else {
                alert(err.message || 'Failed to start quiz');
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteEvent = async () => {
        if (!confirm('Are you sure you want to delete this event and all its data?')) return;
        try {
            await events.delete(id);
            navigate('/dashboard');
        } catch (err) {
            alert(err.message || 'Failed to delete event');
        }
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
        return <span className={`badge ${colors[status] || ''}`}>{labels[status] || status}</span>;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl text-gray-400">Loading...</div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔍</div>
                    <h2 className="text-xl font-semibold mb-2">Event Not Found</h2>
                    <button onClick={() => navigate('/dashboard')} className="btn-primary mt-4">
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/dashboard')} className="text-gray-500 hover:text-gray-700 text-xl">
                            ←
                        </button>
                        <h1 className="text-xl font-bold text-gray-900">{event.name}</h1>
                        {getStatusBadge(event.status)}
                    </div>
                    {event.status === 'setup' && (
                        <div className="flex gap-2">
                            <Link to={`/events/${id}/edit`} className="btn-secondary text-sm py-2 px-4">
                                Edit Event
                            </Link>
                        </div>
                    )}
                    {event.status !== 'in_progress' && (
                        <button onClick={handleDeleteEvent} className="btn-danger text-sm py-2 px-4">
                            Delete
                        </button>
                    )}
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Event Info */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="card text-center">
                        <div className="text-3xl font-bold text-gray-900">{event.total_questions || 0}</div>
                        <div className="text-sm text-gray-500 mt-1">Total Questions</div>
                    </div>
                    <div className="card text-center">
                        <div className="text-3xl font-bold text-gray-900">{event.total_teams || 0}</div>
                        <div className="text-sm text-gray-500 mt-1">Total Teams</div>
                    </div>
                    <div className="card text-center">
                        <div className="text-3xl font-bold text-gray-900">{event.date}</div>
                        <div className="text-sm text-gray-500 mt-1">Event Date</div>
                    </div>
                </div>

                {event.description && (
                    <div className="card mb-8">
                        <p className="text-gray-600 text-lg">{event.description}</p>
                    </div>
                )}

                {/* Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <Link to={`/events/${id}/questions`} className="card hover:shadow-md transition-shadow cursor-pointer">
                        <div className="text-4xl mb-3">📝</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Questions</h3>
                        <p className="text-gray-500 text-sm">
                            {questionList.length > 0
                                ? `${questionList.length} questions prepared`
                                : 'Add questions for the quiz'}
                        </p>
                    </Link>

                    <Link to={`/events/${id}/teams`} className="card hover:shadow-md transition-shadow cursor-pointer">
                        <div className="text-4xl mb-3">👥</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Register Teams</h3>
                        <p className="text-gray-500 text-sm">
                            {teamList.length > 0
                                ? `${teamList.length} teams registered`
                                : 'Add teams for the competition'}
                        </p>
                    </Link>

                    <div
                        onClick={handleStartQuiz}
                        className={`card hover:shadow-md transition-shadow cursor-pointer ${event.status === 'completed' ? 'opacity-50 cursor-not-allowed' : ''
                            } ${actionLoading ? 'opacity-75' : ''}`}
                    >
                        <div className="text-4xl mb-3">
                            {event.status === 'in_progress' ? '▶️' : event.status === 'completed' ? '🏆' : '🎮'}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {event.status === 'in_progress'
                                ? 'Resume Existing Game'
                                : event.status === 'completed'
                                    ? 'Quiz Completed'
                                    : 'Start Quiz'}
                        </h3>
                        <p className="text-gray-500 text-sm">
                            {event.status === 'completed'
                                ? 'View final rankings and results'
                                : event.status === 'in_progress'
                                    ? 'Continue the ongoing quiz from where it left off'
                                    : 'Begin the quiz competition'}
                        </p>
                    </div>
                </div>

                {/* Questions overview */}
                <div className="card mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Questions Overview</h3>
                        <Link to={`/events/${id}/questions`} className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                            Manage →
                        </Link>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-green-400"></span>
                            <span className="text-sm text-gray-600">
                                Easy: {questionList.filter(q => q.difficulty === 'easy').length}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-orange-400"></span>
                            <span className="text-sm text-gray-600">
                                Medium: {questionList.filter(q => q.difficulty === 'medium').length}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-red-400"></span>
                            <span className="text-sm text-gray-600">
                                Hard: {questionList.filter(q => q.difficulty === 'hard').length}
                            </span>
                        </div>
                    </div>
                    {/* Show used questions stats for ongoing/completed events */}
                    {event.status !== 'setup' && (
                        <div className="mt-3 text-sm text-gray-500">
                            {event.used_questions || 0} of {event.total_questions || 0} questions answered
                        </div>
                    )}
                </div>

                {/* Teams overview */}
                <div className="card mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Registered Teams</h3>
                        <Link to={`/events/${id}/teams`} className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                            Manage →
                        </Link>
                    </div>
                    {teamList.length > 0 ? (
                        <div className="flex flex-wrap gap-3">
                            {teamList.map((team) => (
                                <span key={team.id} className="badge bg-primary-100 text-primary-700 text-base px-4 py-2">
                                    {team.team_name}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm">No teams registered yet</p>
                    )}
                </div>

                {/* View Results if completed */}
                {event.status === 'completed' && (
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Results</h3>
                            <Link
                                to={`/events/${id}/results`}
                                className="btn-primary text-sm py-2 px-4"
                            >
                                View Full Results
                            </Link>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}