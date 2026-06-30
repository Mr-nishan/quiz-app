import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { teams as teamsApi } from '../api/client';

export default function TeamRegisterPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [teamList, setTeamList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newTeamName, setNewTeamName] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');

    useEffect(() => {
        loadTeams();
    }, [id]);

    const loadTeams = async () => {
        try {
            const data = await teamsApi.list(id);
            setTeamList(data);
        } catch (err) {
            console.error('Failed to load teams:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTeam = async (e) => {
        e.preventDefault();
        if (!newTeamName.trim()) return;

        try {
            await teamsApi.create(id, { team_name: newTeamName.trim() });
            setNewTeamName('');
            loadTeams();
        } catch (err) {
            alert(err.message || 'Failed to add team');
        }
    };

    const handleEdit = async (teamId) => {
        if (!editName.trim()) return;
        try {
            await teamsApi.update(id, teamId, { team_name: editName.trim() });
            setEditingId(null);
            setEditName('');
            loadTeams();
        } catch (err) {
            alert(err.message || 'Failed to update team');
        }
    };

    const handleDelete = async (teamId) => {
        if (!confirm('Remove this team?')) return;
        try {
            await teamsApi.delete(id, teamId);
            loadTeams();
        } catch (err) {
            alert(err.message || 'Failed to delete team');
        }
    };

    const teamColors = [
        'bg-blue-100 text-blue-800 border-blue-300',
        'bg-green-100 text-green-800 border-green-300',
        'bg-purple-100 text-purple-800 border-purple-300',
        'bg-pink-100 text-pink-800 border-pink-300',
        'bg-yellow-100 text-yellow-800 border-yellow-300',
        'bg-indigo-100 text-indigo-800 border-indigo-300',
        'bg-teal-100 text-teal-800 border-teal-300',
        'bg-rose-100 text-rose-800 border-rose-300',
    ];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl text-gray-400">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
                    <button onClick={() => navigate(`/events/${id}`)} className="text-gray-500 hover:text-gray-700 text-xl">
                        ←
                    </button>
                    <h1 className="text-xl font-bold text-gray-900">Register Teams</h1>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-8">
                {/* Add Team Form */}
                <div className="card mb-6">
                    <form onSubmit={handleAddTeam} className="flex gap-3">
                        <input
                            type="text"
                            className="input flex-1"
                            placeholder="Enter team name..."
                            value={newTeamName}
                            onChange={(e) => setNewTeamName(e.target.value)}
                            autoFocus
                        />
                        <button type="submit" disabled={!newTeamName.trim()} className="btn-primary">
                            Add Team
                        </button>
                    </form>
                </div>

                {/* Team List */}
                {teamList.length === 0 ? (
                    <div className="card text-center py-16">
                        <div className="text-6xl mb-4">👥</div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Teams Registered</h3>
                        <p className="text-gray-500">Add teams to start the quiz competition</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {teamList.map((team, index) => (
                            <div
                                key={team.id}
                                className={`card border-l-4 ${teamColors[index % teamColors.length].split(' ').slice(-1)[0]}`}
                            >
                                {editingId === team.id ? (
                                    <div className="flex gap-3 items-center">
                                        <span className="text-lg font-bold text-gray-400 shrink-0">#{index + 1}</span>
                                        <input
                                            type="text"
                                            className="input flex-1"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && handleEdit(team.id)}
                                        />
                                        <button onClick={() => handleEdit(team.id)} className="btn-success text-sm py-2 px-4">
                                            Save
                                        </button>
                                        <button onClick={() => { setEditingId(null); setEditName(''); }} className="btn-secondary text-sm py-2 px-4">
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <span className={`badge ${teamColors[index % teamColors.length]} text-lg px-5 py-2`}>
                                                {team.team_name}
                                            </span>
                                            <span className="text-sm text-gray-400">
                                                Score: {team.score}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setEditingId(team.id); setEditName(team.team_name); }}
                                                className="btn-secondary text-sm py-1.5 px-3"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(team.id)}
                                                className="btn-danger text-sm py-1.5 px-3"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {teamList.length > 0 && (
                    <div className="mt-6 text-center text-sm text-gray-400">
                        {teamList.length} team{teamList.length > 1 ? 's' : ''} registered
                    </div>
                )}
            </main>
        </div>
    );
}