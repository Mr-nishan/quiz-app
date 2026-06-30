import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { events } from '../api/client';

export default function EventFormPage() {
    const { id } = useParams();
    const isEdit = !!id;
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        date: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isEdit) {
            loadEvent();
        }
    }, [id]);

    const loadEvent = async () => {
        try {
            const data = await events.get(id);
            setFormData({
                name: data.name,
                description: data.description || '',
                date: data.date,
            });
        } catch (err) {
            setError('Failed to load event');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isEdit) {
                await events.update(id, formData);
            } else {
                await events.create(formData);
            }
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Failed to save event');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard')} className="text-gray-500 hover:text-gray-700 text-xl">
                        ←
                    </button>
                    <h1 className="text-xl font-bold text-gray-900">
                        {isEdit ? 'Edit Event' : 'Create Event'}
                    </h1>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-8">
                <div className="card">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="label">Event Name *</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="e.g. Annual Quiz Competition 2026"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="label">Description</label>
                            <textarea
                                className="input min-h-[100px] resize-y"
                                placeholder="Event description..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="label">Date *</label>
                            <input
                                type="date"
                                className="input"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button type="submit" disabled={loading} className="btn-primary flex-1">
                                {loading ? 'Saving...' : isEdit ? 'Update Event' : 'Create Event'}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard')}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}