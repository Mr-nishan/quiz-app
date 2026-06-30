import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quiz as quizApi, questions as questionsApi } from '../api/client';

export default function QuizDashboardPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [gameState, setGameState] = useState(null);
    const [boardQuestions, setBoardQuestions] = useState([]);
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [showAnswer, setShowAnswer] = useState(false);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [timer, setTimer] = useState(40);
    const [timerActive, setTimerActive] = useState(false);
    const [allTeamsFailed, setAllTeamsFailed] = useState(false);
    const [celebration, setCelebration] = useState(null);
    const [resumeRestored, setResumeRestored] = useState(false);

    // Ref to track the current active state for polling without recreating loadGameState
    const activeStateRef = useRef({ selectedQuestionId: null, isCelebrating: false });

    useEffect(() => {
        activeStateRef.current.selectedQuestionId = selectedQuestion?.id || null;
        activeStateRef.current.isCelebrating = !!celebration;
    }, [selectedQuestion, celebration]);

    const loadGameState = useCallback(async () => {
        try {
            const [state, board] = await Promise.all([
                quizApi.state(id),
                questionsApi.board(id),
            ]);
            setGameState(state);
            setBoardQuestions(board);

            // Sync active question from polling (for presentation screens or multi-device)
            const { selectedQuestionId, isCelebrating } = activeStateRef.current;
            if (state.activeQuestion) {
                if (selectedQuestionId !== state.activeQuestion.id) {
                    setSelectedQuestion(state.activeQuestion);
                    setShowAnswer(false);
                    setTimerActive(true);
                    const elapsed = state.event.elapsedSeconds || 0;
                    setTimer(Math.max(0, 40 - elapsed));
                }
            } else if (!state.activeQuestion && selectedQuestionId !== null) {
                // Question was closed or answered by another screen
                if (!isCelebrating) {
                    setSelectedQuestion(null);
                    setShowAnswer(false);
                    setTimerActive(false);
                    setAllTeamsFailed(false);
                    setTimer(40);
                }
            }
        } catch (err) {
            console.error('Failed to load game state:', err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    const loadResumeState = useCallback(async () => {
        try {
            const resumeData = await quizApi.resume(id);
            setGameState({
                event: resumeData.event,
                teams: resumeData.teams,
                currentTeam: resumeData.currentTeam,
                activeQuestion: resumeData.activeQuestion,
                teamOrder: resumeData.teamOrder,
                stats: resumeData.stats,
                history: resumeData.gameHistory,
            });

            // Restore active question from database if one exists
            if (resumeData.activeQuestion) {
                setSelectedQuestion(resumeData.activeQuestion);
                setShowAnswer(false);
                setTimerActive(true);
                const elapsed = resumeData.event.elapsedSeconds || 0;
                setTimer(Math.max(0, 40 - elapsed));
            }

            const [board] = await Promise.all([
                questionsApi.board(id),
            ]);
            setBoardQuestions(board);
            setResumeRestored(true);
        } catch (err) {
            console.error('Failed to load resume state:', err);
            // Fall back to normal state loading
            await loadGameState();
            setResumeRestored(true);
        } finally {
            setLoading(false);
        }
    }, [id, loadGameState]);

    useEffect(() => {
        loadResumeState();
    }, [loadResumeState]);

    // Refresh state every 5 seconds for live updates
    useEffect(() => {
        if (gameState?.event?.status === 'in_progress') {
            const interval = setInterval(loadGameState, 5000);
            return () => clearInterval(interval);
        }
    }, [gameState?.event?.status, loadGameState]);

    // Persist question selection to database BEFORE updating local state
    const handleSelectQuestion = async (q) => {
        if (q.used) return;
        setActionLoading(true);
        try {
            // Persist to database first
            const result = await quizApi.select(id, q.id);
            // Now update local state
            setSelectedQuestion(result.question);
            setShowAnswer(false);
            setAllTeamsFailed(false);
            setCelebration(null);
            setTimer(40);
            setTimerActive(true);
        } catch (err) {
            // If question already active, restore it
            if (err.message && err.message.includes('already active')) {
                // Reload state to get the active question
                await loadGameState();
            } else {
                alert(err.message || 'Failed to select question');
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleAnswer = async (result) => {
        if (!selectedQuestion || actionLoading) return;
        setActionLoading(true);
        setTimerActive(false);
        try {
            const data = await quizApi.answer(id, selectedQuestion.id, result);

            if (data.allTeamsFailed) {
                setShowAnswer(false);
                setAllTeamsFailed(true);
                setTimer(40);
            } else if (result === 'wrong') {
                // Wrong but other teams still get a chance — keep question active in DB
                setShowAnswer(false);
                setTimer(40);
                setTimerActive(true);
            } else {
                // Correct — trigger celebration with answer revealed
                setCelebration({
                    teamName: gameState?.currentTeam?.team_name || 'Team',
                    points: selectedQuestion.points,
                });
                setShowAnswer(true);
                setTimeout(async () => {
                    await loadGameState();
                    setSelectedQuestion(null);
                    setShowAnswer(false);
                    setCelebration(null);
                    setTimer(40);
                }, 3000);
                return;
            }

            if (data.gameOver) {
                navigate(`/events/${id}/results`);
                return;
            }

            await loadGameState();
        } catch (err) {
            alert(err.message || 'Failed to record answer');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCloseQuestion = async () => {
        // Cancel the question selection in the database
        try {
            await quizApi.cancelSelect(id);
        } catch (err) {
            console.error('Failed to cancel question selection:', err);
        }
        setSelectedQuestion(null);
        setShowAnswer(false);
        setTimerActive(false);
        setAllTeamsFailed(false);
        setCelebration(null);
        setTimer(40);
    };

    const handleNextAfterAllFailed = async () => {
        setActionLoading(true);
        try {
            await quizApi.nextTeam(id);
            await loadGameState();
            setSelectedQuestion(null);
            setShowAnswer(false);
            setTimerActive(false);
            setAllTeamsFailed(false);
            setCelebration(null);
            setTimer(40);
        } catch (err) {
            console.error('Failed to advance turn:', err);
        } finally {
            setActionLoading(false);
        }
    };

    // 40-second countdown timer
    useEffect(() => {
        if (!timerActive || !selectedQuestion || allTeamsFailed || celebration) return;
        if (timer <= 0) {
            setTimerActive(false);
            if (selectedQuestion && gameState?.event?.status === 'in_progress') {
                handleAnswer('wrong');
            }
            return;
        }
        const interval = setInterval(() => {
            setTimer((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [timerActive, timer, selectedQuestion, gameState?.event?.status, allTeamsFailed, celebration]);

    // Reset timer when question is deselected
    useEffect(() => {
        if (!selectedQuestion) {
            setTimerActive(false);
            setTimer(40);
            setAllTeamsFailed(false);
        }
    }, [selectedQuestion]);

    const handleNextTeam = async () => {
        setActionLoading(true);
        try {
            await quizApi.nextTeam(id);
            await loadGameState();
        } catch (err) {
            alert(err.message || 'Failed to skip turn');
        } finally {
            setActionLoading(false);
        }
    };

    const getQuestionDisplay = (q) => {
        const prefix = {
            easy: 'E',
            medium: 'M',
            hard: 'H',
        }[q.difficulty] || 'Q';

        return `${prefix}${q.sort_order || q.id}`;
    };

    const getDifficultyColor = (difficulty) => {
        const colors = {
            easy: 'border-green-400 bg-green-50 text-green-800 hover:bg-green-100',
            medium: 'border-orange-400 bg-orange-50 text-orange-800 hover:bg-orange-100',
            hard: 'border-red-400 bg-red-50 text-red-800 hover:bg-red-100',
        };
        return colors[difficulty] || '';
    };

    const confettiParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 1.5 + Math.random() * 1.5,
        color: ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 6)],
        size: 6 + Math.random() * 8,
        rotation: Math.random() * 360,
    }));

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl text-gray-400">Loading quiz...</div>
            </div>
        );
    }

    if (!gameState || gameState.event.status === 'setup') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h2 className="text-xl font-semibold mb-2">Quiz Not Started</h2>
                    <button onClick={() => navigate(`/events/${id}`)} className="btn-primary mt-4">
                        Back to Event
                    </button>
                </div>
            </div>
        );
    }

    const { event, teams, currentTeam, stats, history, activeQuestion } = gameState;
    const teamOrder = gameState.teamOrder || [];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Celebration Overlay */}
            {celebration && (
                <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
                    {confettiParticles.map((p) => (
                        <div
                            key={p.id}
                            className="absolute animate-confetti"
                            style={{
                                left: `${p.left}%`,
                                top: '-10px',
                                width: `${p.size}px`,
                                height: `${p.size}px`,
                                backgroundColor: p.color,
                                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                                transform: `rotate(${p.rotation}deg)`,
                                animationDelay: `${p.delay}s`,
                                animationDuration: `${p.duration}s`,
                            }}
                        />
                    ))}
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 text-center animate-bounce-in pointer-events-auto">
                        <div className="text-6xl mb-4">🎉</div>
                        <h2 className="text-3xl font-bold text-green-600 mb-2">Correct Answer!</h2>
                        <p className="text-xl text-gray-700 mb-1">
                            <span className="font-bold text-blue-600">{celebration.teamName}</span> got it right!
                        </p>
                        <p className="text-lg text-gray-500">
                            +{celebration.points} points awarded
                        </p>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="text-2xl">🎯</span>
                        <h1 className="text-xl font-bold text-gray-900">{event.name}</h1>
                        <span className="badge bg-blue-100 text-blue-700">
                            {event.status === 'in_progress' ? 'In Progress' : 'Completed'}
                        </span>
                        {resumeRestored && (
                            <span className="badge bg-yellow-100 text-yellow-700 text-xs">
                                Resumed
                            </span>
                        )}
                    </div>
                    {event.status === 'completed' && (
                        <button onClick={() => navigate(`/events/${id}/results`)} className="btn-primary">
                            View Results
                        </button>
                    )}
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Left: Question Board */}
                    <div className="lg:col-span-3">
                        {selectedQuestion ? (
                            <div className="card">
                                {/* Current Team Turn Banner inside Question View */}
                                {!allTeamsFailed && !celebration && event.status === 'in_progress' && currentTeam && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="text-sm text-blue-600 font-medium">Currently Answering:</div>
                                            <div className="text-lg font-bold text-blue-900">{currentTeam.team_name}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <div className="text-sm text-blue-600 font-medium">Score</div>
                                                <div className="text-lg font-bold text-blue-900">{currentTeam.score}</div>
                                            </div>
                                            {timerActive && (
                                                <div className={`flex items-center gap-1.5 font-bold text-lg tabular-nums ${timer <= 10 ? 'text-red-600 animate-pulse' : 'text-gray-700'}`}>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    {timer}s
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* All Teams Failed Banner */}
                                {allTeamsFailed && (
                                    <div className="bg-gray-100 border border-gray-300 rounded-xl p-4 mb-4">
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-gray-600 mb-1">⏱ Time's Up! Question Attempt Finished</div>
                                            <p className="text-sm text-gray-500">All teams failed — no points awarded.</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <span className={`badge ${selectedQuestion.difficulty === 'easy' ? 'badge-easy' :
                                            selectedQuestion.difficulty === 'medium' ? 'badge-medium' : 'badge-hard'
                                            } text-base px-4 py-1`}>
                                            {selectedQuestion.difficulty.charAt(0).toUpperCase() + selectedQuestion.difficulty.slice(1)}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                            {selectedQuestion.points} points
                                        </span>
                                        <span className="text-sm text-gray-500">
                                            • Question #{selectedQuestion.sort_order || selectedQuestion.id}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={handleCloseQuestion}
                                            className="text-sm text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5"
                                        >
                                            Close Question ✕
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-8">
                                    {selectedQuestion.image_url && (
                                        <div className="mb-4 rounded-xl overflow-hidden border border-gray-200 max-h-80">
                                            <img
                                                src={selectedQuestion.image_url}
                                                alt="Question image"
                                                className="w-full max-h-80 object-contain bg-gray-100"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        </div>
                                    )}
                                    <p className="text-4xl md:text-5xl text-gray-900 leading-normal font-semibold">
                                        {selectedQuestion.question}
                                    </p>
                                    {selectedQuestion.link_url && (
                                        <a
                                            href={selectedQuestion.link_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 mt-3"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                            Reference Link
                                        </a>
                                    )}
                                </div>

                                {/* Answer Section */}
                                <div className="mb-8">
                                    {showAnswer ? (
                                        <div className={`rounded-lg p-6 ${allTeamsFailed
                                            ? 'bg-orange-50 border border-orange-200'
                                            : 'bg-green-50 border border-green-200'
                                            }`}>
                                            <div className={`text-sm font-medium mb-2 ${allTeamsFailed ? 'text-orange-700' : 'text-green-700'}`}>
                                                {allTeamsFailed ? 'Answer (Revealed for all):' : 'Answer:'}
                                            </div>
                                            <p className={`text-xl font-semibold ${allTeamsFailed ? 'text-orange-900' : 'text-green-900'}`}>
                                                {selectedQuestion.answer}
                                            </p>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowAnswer(true)}
                                            className="btn-warning"
                                        >
                                            Show Answer
                                        </button>
                                    )}
                                </div>

                                {/* Host Controls */}
                                {event.status === 'in_progress' && !celebration && (
                                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                                        {allTeamsFailed ? (
                                            <button
                                                onClick={handleNextAfterAllFailed}
                                                disabled={actionLoading}
                                                className="btn-primary flex-1 text-lg py-4"
                                            >
                                                Next Question →
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => handleAnswer('correct')}
                                                    disabled={actionLoading}
                                                    className="btn-success flex-1 text-lg py-4"
                                                >
                                                    ✓ Correct (+{selectedQuestion.points} pts)
                                                </button>
                                                <button
                                                    onClick={() => handleAnswer('wrong')}
                                                    disabled={actionLoading}
                                                    className="btn-danger flex-1 text-lg py-4"
                                                >
                                                    ✗ Wrong (0 pts)
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                {/* Current Team Turn Banner */}
                                {event.status === 'in_progress' && currentTeam && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-sm text-blue-600 font-medium mb-1">Current Turn</div>
                                                <div className="text-2xl font-bold text-blue-900">{currentTeam.team_name}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm text-blue-600 font-medium mb-1">Score</div>
                                                <div className="text-2xl font-bold text-blue-900">{currentTeam.score}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Question Board */}
                                <div className="card mb-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xl font-semibold text-gray-900">Question Board</h2>
                                        <span className="text-sm text-gray-500">
                                            {stats?.remainingQuestions || 0} questions remaining
                                        </span>
                                    </div>

                                    {/* Easy */}
                                    <div className="mb-6">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="badge-easy">Easy (5 pts)</span>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            {boardQuestions
                                                .filter(q => q.difficulty === 'easy')
                                                .map(q => (
                                                    <button
                                                        key={q.id}
                                                        onClick={() => handleSelectQuestion(q)}
                                                        disabled={q.used === 1 || actionLoading}
                                                        className={`w-24 h-24 rounded-xl border-2 font-bold text-xl transition-all ${q.used === 1
                                                            ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed'
                                                            : 'border-green-400 bg-green-50 text-green-800 hover:bg-green-100 hover:shadow-sm cursor-pointer'
                                                            }`}
                                                    >
                                                        {getQuestionDisplay(q)}
                                                    </button>
                                                ))}
                                        </div>
                                    </div>

                                    {/* Medium */}
                                    <div className="mb-6">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="badge-medium">Medium (10 pts)</span>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            {boardQuestions
                                                .filter(q => q.difficulty === 'medium')
                                                .map(q => (
                                                    <button
                                                        key={q.id}
                                                        onClick={() => handleSelectQuestion(q)}
                                                        disabled={q.used === 1 || actionLoading}
                                                        className={`w-24 h-24 rounded-xl border-2 font-bold text-xl transition-all ${q.used === 1
                                                            ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed'
                                                            : 'border-orange-400 bg-orange-50 text-orange-800 hover:bg-orange-100 hover:shadow-sm cursor-pointer'
                                                            }`}
                                                    >
                                                        {getQuestionDisplay(q)}
                                                    </button>
                                                ))}
                                        </div>
                                    </div>

                                    {/* Hard */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="badge-hard">Hard (15 pts)</span>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            {boardQuestions
                                                .filter(q => q.difficulty === 'hard')
                                                .map(q => (
                                                    <button
                                                        key={q.id}
                                                        onClick={() => handleSelectQuestion(q)}
                                                        disabled={q.used === 1 || actionLoading}
                                                        className={`w-24 h-24 rounded-xl border-2 font-bold text-xl transition-all ${q.used === 1
                                                            ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed'
                                                            : 'border-red-400 bg-red-50 text-red-800 hover:bg-red-100 hover:shadow-sm cursor-pointer'
                                                            }`}
                                                    >
                                                        {getQuestionDisplay(q)}
                                                    </button>
                                                ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Next Team button – only show when no question is selected */}
                                {(!selectedQuestion) && (
                                    <button
                                        onClick={handleNextTeam}
                                        disabled={actionLoading}
                                        className="btn-secondary w-full"
                                    >
                                        Skip to Next Team →
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {/* Right: Live Scoreboard */}
                    <div className="lg:col-span-1">
                        <div className="card sticky top-8">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Scoreboard</h3>

                            {teams.length === 0 ? (
                                <p className="text-gray-400 text-sm">No teams</p>
                            ) : (
                                <div className="space-y-3">
                                    {teams.map((team, index) => (
                                        <div
                                            key={team.id}
                                            className={`p-3 rounded-lg border ${currentTeam?.id === team.id
                                                ? 'border-blue-300 bg-blue-50'
                                                : index === 0
                                                    ? 'border-yellow-300 bg-yellow-50'
                                                    : 'border-gray-200 bg-white'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm font-bold ${index === 0 ? 'text-yellow-600' : 'text-gray-400'
                                                        }`}>
                                                        #{index + 1}
                                                    </span>
                                                    <span className="font-medium text-gray-900 text-sm">
                                                        {team.team_name}
                                                    </span>
                                                    {currentTeam?.id === team.id && (
                                                        <span className="badge bg-blue-100 text-blue-700 text-xs">
                                                            Turn
                                                        </span>
                                                    )}
                                                </div>
                                                <span className={`font-bold text-lg ${index === 0 ? 'text-yellow-600' : 'text-gray-700'
                                                    }`}>
                                                    {team.score}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Game Stats */}
                            <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
                                <div className="flex justify-between text-sm text-gray-500">
                                    <span>Questions Played</span>
                                    <span className="font-medium text-gray-700">{stats?.usedQuestions || 0}/{stats?.totalQuestions || 0}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-500">
                                    <span>Teams</span>
                                    <span className="font-medium text-gray-700">{teams.length}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-500">
                                    <span>Status</span>
                                    <span className={`font-medium ${event.status === 'in_progress' ? 'text-blue-600' : 'text-green-600'
                                        }`}>
                                        {event.status === 'in_progress' ? 'Active' : 'Finished'}
                                    </span>
                                </div>
                            </div>

                            {/* Recent History */}
                            {history && history.length > 0 && (
                                <div className="mt-6 pt-4 border-t border-gray-200">
                                    <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Activity</h4>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {history.slice(0, 10).map((h) => (
                                            <div key={h.id} className="text-xs text-gray-500 flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${h.result === 'correct' ? 'bg-green-400' : 'bg-red-400'
                                                    }`}></span>
                                                <span className="font-medium">{h.team_name}</span>
                                                <span>{h.result === 'correct' ? `+${h.points_awarded}` : '0'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}