import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { questions as questionsApi } from '../api/client';

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const POINTS_MAP = { easy: 5, medium: 10, hard: 15 };
const DIFFICULTY_COLORS = {
    easy: 'border-green-300 bg-green-50',
    medium: 'border-orange-300 bg-orange-50',
    hard: 'border-red-300 bg-red-50',
};

export default function QuestionManagePage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [questionList, setQuestionList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ question: '', answer: '', difficulty: 'easy', link_url: '', image_url: '' });
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        loadQuestions();
    }, [id]);

    const loadQuestions = async () => {
        try {
            const data = await questionsApi.list(id);
            setQuestionList(data);
        } catch (err) {
            console.error('Failed to load questions:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.question.trim() || !formData.answer.trim()) return;

        try {
            if (editingId) {
                await questionsApi.update(id, editingId, formData);
            } else {
                await questionsApi.create(id, formData);
            }
            setFormData({ question: '', answer: '', difficulty: 'easy', link_url: '', image_url: '' });
            setImageError(false);
            setEditingId(null);
            setShowForm(false);
            loadQuestions();
        } catch (err) {
            alert(err.message || 'Failed to save question');
        }
    };

    const handleEdit = (q) => {
        setFormData({ question: q.question, answer: q.answer, difficulty: q.difficulty, link_url: q.link_url || '', image_url: q.image_url || '' });
        setImageError(false);
        setEditingId(q.id);
        setShowForm(true);
    };

    const handleDelete = async (questionId) => {
        if (!confirm('Delete this question?')) return;
        try {
            await questionsApi.delete(id, questionId);
            loadQuestions();
        } catch (err) {
            alert(err.message || 'Failed to delete question');
        }
    };

    const handleBulkSample = async () => {
        const samples = [
            { question: 'What is the capital of France?', answer: 'Paris', difficulty: 'easy' },
            { question: 'What is 5 + 7?', answer: '12', difficulty: 'easy' },
            { question: 'Which planet is known as the Red Planet?', answer: 'Mars', difficulty: 'easy' },
            { question: 'What is the largest ocean on Earth?', answer: 'Pacific Ocean', difficulty: 'easy' },
            { question: 'Who wrote Romeo and Juliet?', answer: 'William Shakespeare', difficulty: 'medium' },
            { question: 'What is the speed of light (approx)?', answer: '300,000 km/s', difficulty: 'medium' },
            { question: 'What year did World War II end?', answer: '1945', difficulty: 'medium' },
            { question: 'Who painted the Mona Lisa?', answer: 'Leonardo da Vinci', difficulty: 'medium' },
            { question: 'What is the chemical symbol for gold?', answer: 'Au', difficulty: 'medium' },
            { question: 'What is the square root of 144?', answer: '12', difficulty: 'medium' },
            { question: 'What is the powerhouse of the cell?', answer: 'Mitochondria', difficulty: 'hard' },
            { question: 'Who developed the theory of general relativity?', answer: 'Albert Einstein', difficulty: 'hard' },
            { question: 'What is the rarest blood type?', answer: 'AB-negative', difficulty: 'hard' },
            { question: 'What element has the atomic number 79?', answer: 'Gold', difficulty: 'hard' },
            { question: 'What is the hardest natural substance?', answer: 'Diamond', difficulty: 'hard' },
        ];

        try {
            await questionsApi.bulk(id, samples);
            loadQuestions();
        } catch (err) {
            alert(err.message || 'Failed to add sample questions');
        }
    };

    const groupedQuestions = (() => {
        const groups = { easy: [], medium: [], hard: [] };
        questionList.forEach((q) => {
            if (groups[q.difficulty]) groups[q.difficulty].push(q);
        });
        return groups;
    })();

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
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(`/events/${id}`)} className="text-gray-500 hover:text-gray-700 text-xl">
                            ←
                        </button>
                        <h1 className="text-xl font-bold text-gray-900">Manage Questions</h1>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleBulkSample} className="btn-secondary text-sm py-2 px-4">
                            Add Sample Questions
                        </button>
                        <button
                            onClick={() => { setShowForm(true); setEditingId(null); setFormData({ question: '', answer: '', difficulty: 'easy', link_url: '', image_url: '' }); setImageError(false); }}
                            className="btn-primary text-sm py-2 px-4"
                        >
                            + Add Question
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Question Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 z-50 overflow-y-auto">
                        {/* Backdrop */}
                        <div 
                            className="fixed inset-0 bg-black/45 transition-opacity" 
                            onClick={() => { setShowForm(false); setEditingId(null); setImageError(false); }}
                        />

                        {/* Scrollable Container */}
                        <div className="flex min-h-full items-center justify-center p-4">
                            <div className="relative card w-full max-w-2xl my-8 z-10">
                                <h2 className="text-xl font-semibold mb-6">
                                    {editingId ? 'Edit Question' : 'Add New Question'}
                                </h2>
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div>
                                        <label className="label">Question *</label>
                                        <textarea
                                            className="input min-h-[80px] resize-y"
                                            placeholder="Enter the question text"
                                            value={formData.question}
                                            onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                                            required
                                            autoFocus
                                        />
                                    </div>

                                    <div>
                                        <label className="label">Answer *</label>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="Enter the correct answer"
                                            value={formData.answer}
                                            onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="label">Image URL (optional)</label>
                                        <input
                                            type="url"
                                            className="input"
                                            placeholder="https://example.com/image.jpg"
                                            value={formData.image_url}
                                            onChange={(e) => {
                                                setFormData({ ...formData, image_url: e.target.value });
                                                setImageError(false);
                                            }}
                                        />
                                        {formData.image_url && !imageError && (
                                            <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 max-h-40">
                                                <img
                                                    src={formData.image_url}
                                                    alt="Preview"
                                                    className="w-full h-40 object-contain bg-gray-100"
                                                    onError={() => setImageError(true)}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="label">Link URL (optional)</label>
                                        <input
                                            type="url"
                                            className="input"
                                            placeholder="https://example.com/reference"
                                            value={formData.link_url}
                                            onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="label">Difficulty</label>
                                        <div className="flex gap-3">
                                            {DIFFICULTIES.map((d) => (
                                                <button
                                                    key={d}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, difficulty: d })}
                                                    className={`flex-1 py-3 px-4 rounded-lg border-2 text-center font-medium capitalize transition-colors ${formData.difficulty === d
                                                        ? d === 'easy' ? 'border-green-400 bg-green-50 text-green-800'
                                                            : d === 'medium' ? 'border-orange-400 bg-orange-50 text-orange-800'
                                                                : 'border-red-400 bg-red-50 text-red-800'
                                                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                                                        }`}
                                                >
                                                    {d} ({POINTS_MAP[d]} pts)
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button type="submit" className="btn-primary flex-1">
                                            {editingId ? 'Update Question' : 'Add Question'}
                                        </button>
                                        <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setImageError(false); }} className="btn-secondary">
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Question Board */}
                {questionList.length === 0 ? (
                    <div className="card text-center py-16">
                        <div className="text-6xl mb-4">📝</div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Questions Yet</h3>
                        <p className="text-gray-500 mb-6">Add questions manually or use sample questions</p>
                        <div className="flex justify-center gap-3">
                            <button
                                onClick={() => { setShowForm(true); }}
                                className="btn-primary"
                            >
                                Add Question
                            </button>
                            <button onClick={handleBulkSample} className="btn-secondary">
                                Add Sample Questions
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {DIFFICULTIES.map((diff) => {
                            const questions = groupedQuestions[diff];
                            if (questions.length === 0) return null;
                            return (
                                <div key={diff}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className={`badge ${diff === 'easy' ? 'badge-easy' : diff === 'medium' ? 'badge-medium' : 'badge-hard'
                                            } text-base px-4 py-1`}>
                                            {diff.charAt(0).toUpperCase() + diff.slice(1)} ({POINTS_MAP[diff]} pts)
                                        </span>
                                        <span className="text-sm text-gray-400">{questions.length} questions</span>
                                    </div>
                                    <div className="grid gap-3">
                                        {questions.map((q, idx) => (
                                            <div key={q.id} className={`card border-l-4 ${DIFFICULTY_COLORS[q.difficulty]}`}>
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-sm font-medium text-gray-400">Q{idx + 1}.</span>
                                                            {q.used === 1 && (
                                                                <span className="badge bg-gray-100 text-gray-500 text-xs">Used</span>
                                                            )}
                                                        </div>
                                                        {q.image_url && (
                                                            <div className="mb-3 rounded-lg overflow-hidden border border-gray-200 max-h-32">
                                                                <img
                                                                    src={q.image_url}
                                                                    alt="Question image"
                                                                    className="w-full h-32 object-contain bg-gray-100"
                                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                                />
                                                            </div>
                                                        )}
                                                        <p className="text-lg text-gray-900 mb-2">{q.question}</p>
                                                        <p className="text-sm text-gray-500">
                                                            <span className="font-medium">Answer:</span> {q.answer}
                                                        </p>
                                                        {q.link_url && (
                                                            <a
                                                                href={q.link_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-1"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                </svg>
                                                                Reference Link
                                                            </a>
                                                        )}
                                                    </div>
                                                    {q.used === 0 && (
                                                        <div className="flex gap-2 shrink-0">
                                                            <button
                                                                onClick={() => handleEdit(q)}
                                                                className="btn-secondary text-sm py-1.5 px-3"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(q.id)}
                                                                className="btn-danger text-sm py-1.5 px-3"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}