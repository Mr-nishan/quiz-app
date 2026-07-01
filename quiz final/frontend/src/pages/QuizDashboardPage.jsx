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
    const [holdQuestion, setHoldQuestion] = useState(false);
    const [resumeRestored, setResumeRestored] = useState(false);

    // Ref to track the current active state for polling without recreating loadGameState
    const activeStateRef = useRef({
        selectedQuestionId: null,
        isCelebrating: false,
        allTeamsFailed: false,
        holdQuestion: false,
    });
    const correctSoundRef = useRef(null);
    const wrongSoundRef = useRef(null);

    useEffect(() => {
        correctSoundRef.current = new Audio('/sounds/correct.wav');
        wrongSoundRef.current = new Audio('/sounds/wrong.wav');

        return () => {
            correctSoundRef.current?.pause();
            wrongSoundRef.current?.pause();
        };
    }, []);

    const playAnswerSound = useCallback((result) => {
        const audio = result === 'correct' ? correctSoundRef.current : wrongSoundRef.current;
        if (!audio) return;

        try {
            audio.pause();
            audio.currentTime = 0;
            audio.play().catch(() => {});
        } catch (err) {
            console.warn('Failed to play answer sound', err);
        }
    }, []);

    useEffect(() => {
        activeStateRef.current.selectedQuestionId = selectedQuestion?.id || null;
        activeStateRef.current.isCelebrating = !!celebration;
        activeStateRef.current.allTeamsFailed = allTeamsFailed;
        activeStateRef.current.holdQuestion = holdQuestion;
    }, [selectedQuestion, celebration, allTeamsFailed, holdQuestion]);

    const loadGameState = useCallback(async () => {
        try {
            const [state, board] = await Promise.all([
                quizApi.state(id),
                questionsApi.board(id),
            ]);
            setGameState(state);
            setBoardQuestions(board);

            // Sync active question from polling (for presentation screens or multi-device)
            const { selectedQuestionId, isCelebrating, allTeamsFailed: activeAllTeamsFailed, holdQuestion: activeHoldQuestion } = activeStateRef.current;
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
                if (!isCelebrating && !activeAllTeamsFailed && !activeHoldQuestion) {
                    setSelectedQuestion(null);
                    setShowAnswer(false);
                    setTimerActive(false);
                    setAllTeamsFailed(false);
                    setTimer(40);
                }
            }
            return state;
        } catch (err) {
            console.error('Failed to load game state:', err);
            return null;
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
            playAnswerSound(result);

            if (data.allTeamsFailed) {
                setAllTeamsFailed(true);
                setHoldQuestion(true);
                setShowAnswer(false);
                setTimerActive(false);
                await loadGameState();
                return;
            }

            if (result === 'wrong') {
                // Wrong but other teams still get a chance — keep question active in DB
                setShowAnswer(false);
                setTimer(40);
                setTimerActive(true);
                await loadGameState();
                return;
            }

            // Correct — reveal answer automatically, show celebration, and keep question displayed until the host proceeds
            setCelebration({
                teamName: gameState?.currentTeam?.team_name || 'Team',
                points: selectedQuestion.points,
            });
            setHoldQuestion(true);
            setShowAnswer(true);
            setTimerActive(false);
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
        setHoldQuestion(false);
        setTimer(40);
    };

    const handleProceedToNextQuestion = async () => {
        setActionLoading(true);
        try {
            const updatedState = await loadGameState();
            setSelectedQuestion(null);
            setShowAnswer(false);
            setTimerActive(false);
            setAllTeamsFailed(false);
            setCelebration(null);
            setHoldQuestion(false);
            setTimer(40);

            if (updatedState?.event?.status === 'completed') {
                navigate(`/events/${id}/results`);
            }
        } catch (err) {
            console.error('Failed to advance question:', err);
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

    // Auto-hide the celebration overlay after 5 seconds while leaving the answer visible
    useEffect(() => {
        if (!celebration) return;
        const timeout = setTimeout(() => setCelebration(null), 5000);
        return () => clearTimeout(timeout);
    }, [celebration]);

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

    useEffect(() => {
        const handleShortcut = (event) => {
            const target = event.target;
            const tagName = target?.tagName;
            const isTyping =
                tagName === 'INPUT' ||
                tagName === 'TEXTAREA' ||
                tagName === 'SELECT' ||
                target?.isContentEditable;

            if (isTyping || event.altKey || event.ctrlKey || event.metaKey || actionLoading) return;
            if (!selectedQuestion || gameState?.event?.status !== 'in_progress') return;

            const key = event.key.toLowerCase();
            const canGradeAnswer = !allTeamsFailed && !celebration && !holdQuestion;
            const canProceed = celebration || allTeamsFailed || holdQuestion;
            const canRevealAnswer = allTeamsFailed && !showAnswer;

            if (key === 'c' && canGradeAnswer) {
                event.preventDefault();
                handleAnswer('correct');
            } else if (key === 'w' && canGradeAnswer) {
                event.preventDefault();
                handleAnswer('wrong');
            } else if (key === 'n' && canProceed) {
                event.preventDefault();
                handleProceedToNextQuestion();
            } else if (key === 'r' && canRevealAnswer) {
                event.preventDefault();
                setShowAnswer(true);
            }
        };

        window.addEventListener('keydown', handleShortcut);
        return () => window.removeEventListener('keydown', handleShortcut);
    }, [
        actionLoading,
        allTeamsFailed,
        celebration,
        gameState?.event?.status,
        handleAnswer,
        handleProceedToNextQuestion,
        holdQuestion,
        selectedQuestion,
        showAnswer,
    ]);

    const ShortcutKey = ({ children }) => (
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-white/40 bg-white/20 px-1.5 text-xs font-extrabold">
            {children}
        </span>
    );

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
                            <div className="card p-6 space-y-6">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className={`badge ${selectedQuestion.difficulty === 'easy' ? 'badge-easy' :
                                                selectedQuestion.difficulty === 'medium' ? 'badge-medium' : 'badge-hard'
                                                } text-base px-4 py-1`}>
                                                {selectedQuestion.difficulty.charAt(0).toUpperCase() + selectedQuestion.difficulty.slice(1)}
                                            </span>
                                            <span className="text-sm text-gray-500 font-semibold">
                                                {selectedQuestion.points} points
                                            </span>
                                            <span className="text-sm text-gray-500 font-medium">
                                                • Question #{selectedQuestion.sort_order || selectedQuestion.id}
                                            </span>
                                        </div>
                                        <div className="text-gray-700 text-sm">Host Control</div>
                                    </div>
                                    <button
                                        onClick={handleCloseQuestion}
                                        className="self-start text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1"
                                    >
                                        Close Question ✕
                                    </button>
                                </div>

                                <div className="flex flex-col gap-6">
                                    <div className="order-2 space-y-6">
                                        <p className="text-4xl md:text-5xl lg:text-6xl text-gray-900 leading-tight font-extrabold">
                                            {selectedQuestion.question}
                                        </p>

                                        {selectedQuestion.image_url && (
                                            <div className="rounded-xl overflow-hidden border border-gray-200 max-h-60 bg-gray-100 flex items-center justify-center">
                                                <img
                                                    src={selectedQuestion.image_url}
                                                    alt="Question image"
                                                    className="max-w-full max-h-60 object-contain"
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                            </div>
                                        )}

                                        {selectedQuestion.link_url && (
                                            <a
                                                href={selectedQuestion.link_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                                Reference Link
                                            </a>
                                        )}

                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Correct Answer</div>
                                            {showAnswer ? (
                                                <p className="text-lg font-bold text-green-700 bg-green-50 border border-green-200 p-2 rounded-lg">
                                                    {selectedQuestion.answer}
                                                </p>
                                            ) : allTeamsFailed ? (
                                                <button
                                                    onClick={() => setShowAnswer(true)}
                                                    className="w-full py-2 px-4 rounded-lg bg-orange-400 text-white font-semibold text-sm hover:bg-orange-500 transition-colors shadow-sm"
                                                    aria-keyshortcuts="R"
                                                >
                                                    <span className="inline-flex items-center justify-center gap-2">
                                                        Show Answer
                                                        <ShortcutKey>R</ShortcutKey>
                                                    </span>
                                                </button>
                                            ) : (
                                                <p className="text-sm text-gray-500">
                                                    Answer hidden until the question is over.
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="contents">
                                        {!allTeamsFailed && !celebration && event.status === 'in_progress' && currentTeam && (
                                            <div className="order-1 bg-blue-50 border border-blue-200 rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">Current Turn</span>
                                                    {timerActive && (
                                                        <div className={`flex items-center gap-1 font-bold text-base tabular-nums ${timer <= 10 ? 'text-red-600 animate-pulse' : 'text-gray-700'}`}>
                                                            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            {timer}s
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-xl font-extrabold text-blue-900 mb-1">{currentTeam.team_name}</div>
                                                <div className="text-xs text-blue-700">Team Score: <span className="font-bold">{currentTeam.score} pts</span></div>
                                            </div>
                                        )}

                                        {allTeamsFailed && (
                                            <div className="order-1 bg-gray-100 border border-gray-300 rounded-xl p-4 text-center">
                                                <div className="text-base font-bold text-gray-700 mb-1">⏱ Time's Up!</div>
                                                <p className="text-xs text-gray-500">All teams failed — no points awarded.</p>
                                            </div>
                                        )}

                                        {(celebration || allTeamsFailed || holdQuestion) && (
                                        <div className="order-3 rounded-3xl bg-white border border-gray-200 p-4 shadow-sm">
                                            {event.status === 'in_progress' && selectedQuestion && (
                                                <div className="flex flex-col gap-3">
                                                    {(celebration || allTeamsFailed || holdQuestion) ? (
                                                        <button
                                                            onClick={handleProceedToNextQuestion}
                                                            disabled={actionLoading}
                                                            aria-keyshortcuts="N"
                                                            className="w-full py-3.5 px-4 rounded-xl bg-blue-600 text-white font-bold text-base hover:bg-blue-700 transition-colors shadow-md"
                                                        >
                                                            <ShortcutKey>N</ShortcutKey>
                                                            Next Question →
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => handleAnswer('correct')}
                                                                disabled={actionLoading}
                                                                aria-keyshortcuts="C"
                                                                className="w-full py-3 px-4 rounded-xl bg-green-600 text-white font-bold text-base hover:bg-green-700 transition-colors shadow-md"
                                                            >
                                                                <ShortcutKey>C</ShortcutKey>
                                                                ✓ Correct (+{selectedQuestion.points} pts)
                                                            </button>
                                                            <button
                                                                onClick={() => handleAnswer('wrong')}
                                                                disabled={actionLoading}
                                                                aria-keyshortcuts="W"
                                                                className="w-full py-3 px-4 rounded-xl bg-red-600 text-white font-bold text-base hover:bg-red-700 transition-colors shadow-md"
                                                            >
                                                                <ShortcutKey>W</ShortcutKey>
                                                                ✗ Wrong (0 pts)
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        )}
                                    </div>
                                </div>
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
