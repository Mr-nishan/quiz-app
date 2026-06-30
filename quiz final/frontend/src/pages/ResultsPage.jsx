import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quiz as quizApi } from '../api/client';

export default function ResultsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadResults();
    }, [id]);

    const loadResults = async () => {
        try {
            const data = await quizApi.results(id);
            setResults(data);
        } catch (err) {
            console.error('Failed to load results:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl text-gray-400">Loading results...</div>
            </div>
        );
    }

    if (!results) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔍</div>
                    <h2 className="text-xl font-semibold mb-2">Results Not Available</h2>
                    <button onClick={() => navigate('/dashboard')} className="btn-primary mt-4">
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const { event, rankings, winner, runnerUp, totalQuestions, history } = results;
    const trophyEmojis = ['🥇', '🥈', '🥉'];

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(`/events/${id}`)} className="text-gray-500 hover:text-gray-700 text-xl">
                            ←
                        </button>
                        <h1 className="text-xl font-bold text-gray-900">Quiz Results</h1>
                    </div>
                    <button onClick={() => navigate('/dashboard')} className="btn-secondary text-sm py-2 px-4">
                        Dashboard
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                {/* Event Header */}
                <div className="text-center mb-8">
                    <div className="text-5xl mb-3">🏆</div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">{event.name}</h2>
                    <p className="text-gray-500">{event.date}</p>
                </div>

                {/* Winner Card */}
                {winner && (
                    <div className="card bg-yellow-50 border-yellow-300 text-center mb-8 py-10">
                        <div className="text-7xl mb-4">🥇</div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Champion</h3>
                        <div className="text-4xl font-bold text-yellow-700 mb-2">{winner.team_name}</div>
                        <div className="text-2xl font-semibold text-yellow-600">{winner.score} points</div>
                    </div>
                )}

                {/* Runner Up and Rankings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {runnerUp && (
                        <div className="card text-center border-gray-200">
                            <div className="text-5xl mb-3">🥈</div>
                            <h4 className="text-lg font-semibold text-gray-700 mb-1">Runner Up</h4>
                            <div className="text-xl font-bold text-gray-900">{runnerUp.team_name}</div>
                            <div className="text-lg text-gray-600">{runnerUp.score} points</div>
                        </div>
                    )}

                    <div className="card text-center border-gray-200">
                        <div className="text-5xl mb-3">📊</div>
                        <h4 className="text-lg font-semibold text-gray-700 mb-1">Total Questions</h4>
                        <div className="text-xl font-bold text-gray-900">{totalQuestions}</div>
                        <div className="text-lg text-gray-600">Played</div>
                    </div>
                </div>

                {/* Full Rankings */}
                <div className="card mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6">Final Rankings</h3>
                    <div className="space-y-3">
                        {rankings.map((team, index) => (
                            <div
                                key={team.id}
                                className={`flex items-center justify-between p-4 rounded-lg border ${index === 0
                                        ? 'border-yellow-300 bg-yellow-50'
                                        : index === 1
                                            ? 'border-gray-300 bg-gray-50'
                                            : index === 2
                                                ? 'border-orange-200 bg-orange-50'
                                                : 'border-gray-200 bg-white'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl">{trophyEmojis[index] || `#${index + 1}`}</span>
                                    <div>
                                        <div className="font-semibold text-gray-900 text-lg">{team.team_name}</div>
                                    </div>
                                </div>
                                <div className="text-xl font-bold text-gray-900">{team.score} pts</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Game History */}
                {history && history.length > 0 && (
                    <div className="card">
                        <h3 className="text-xl font-semibold text-gray-900 mb-6">Game History</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="pb-3 text-sm font-medium text-gray-500">Team</th>
                                        <th className="pb-3 text-sm font-medium text-gray-500">Question</th>
                                        <th className="pb-3 text-sm font-medium text-gray-500">Difficulty</th>
                                        <th className="pb-3 text-sm font-medium text-gray-500">Result</th>
                                        <th className="pb-3 text-sm font-medium text-gray-500">Points</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((h) => (
                                        <tr key={h.id} className="border-b border-gray-100 last:border-0">
                                            <td className="py-3 font-medium text-gray-900">{h.team_name}</td>
                                            <td className="py-3 text-gray-600 max-w-xs truncate">{h.question_text}</td>
                                            <td className="py-3">
                                                <span className={`badge ${h.difficulty === 'easy' ? 'badge-easy' :
                                                        h.difficulty === 'medium' ? 'badge-medium' : 'badge-hard'
                                                    }`}>
                                                    {h.difficulty}
                                                </span>
                                            </td>
                                            <td className="py-3">
                                                <span className={`badge ${h.result === 'correct' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {h.result}
                                                </span>
                                            </td>
                                            <td className="py-3 font-semibold text-gray-900">
                                                {h.result === 'correct' ? `+${h.points_awarded}` : '0'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}