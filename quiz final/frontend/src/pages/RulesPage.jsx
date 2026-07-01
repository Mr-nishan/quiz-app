import { useNavigate } from 'react-router-dom';

export default function RulesPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 py-12 px-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-10">
                    <button
                        onClick={() => navigate(-1)}
                        className="text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-2 font-medium"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back
                    </button>
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                        Player Rules
                    </h1>
                    <div className="w-20"></div>
                </div>

                <div className="space-y-8">
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                <span className="text-2xl">🎯</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-3">Welcome Players</h2>
                                <p className="text-gray-600 leading-relaxed">
                                    This quiz is played with teamwork, speed, and focus. Every team must follow the rules below during the game.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="text-3xl mb-4">⏱️</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">1. Rotation Timer</h3>
                            <p className="text-gray-600">
                                When a question is opened, the active team gets a full <span className="font-bold text-red-500">40-second timer</span> to answer. If they answer incorrectly or the timer ends, the turn moves to the next team.
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="text-3xl mb-4">🔁</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">2. Steal and Rotation</h3>
                            <p className="text-gray-600">
                                Each following team gets its own chance to answer. The rotation continues until one team gives the correct answer or all teams fail the question.
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="text-3xl mb-4">❓</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">3. If Everyone Gets It Wrong</h3>
                            <p className="text-gray-600">
                                If every team answers incorrectly, the question is considered failed and no points are awarded for that question. The host will move to the next question.
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="text-3xl mb-4">🎁</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">4. Gift or Bonus Request</h3>
                            <p className="text-gray-600">
                                If an outsider wants to ask for a gift or special request during the game, they may speak to the host. The host is the final judge and the decision must be followed by everyone.
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="text-3xl mb-4">👑</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">5. Incorrect Answers and Mandatory Rules</h3>
                            <p className="text-gray-600">
                                Any incorrect answer gives <span className="font-bold text-red-500">0 points</span> to that team. All players, teams, and spectators must follow the host’s decisions and the quiz rules at all times. These rules are mandatory and cannot be ignored.
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="text-3xl mb-4">🤝</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">6. Fair Play</h3>
                            <p className="text-gray-600">
                                Players must answer honestly and respect the game. No cheating, no outside help, and no disrupting another team while they are playing.
                            </p>
                        </div>
                        

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="text-3xl mb-4">🔔</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">7. No Interruptions</h3>
                            <p className="text-gray-600">
                                Once the timer starts, teams should avoid shouting over each other or interrupting the active team. The host will maintain order.
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="text-3xl mb-4">🧡</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">8. Respect and Sportsmanship</h3>
                            <p className="text-gray-600">
                                Good sportsmanship is required at all times. Cheer fairly, accept results gracefully, and keep the atmosphere positive for everyone.
                            </p>
                        </div>
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="text-3xl mb-4">⚜️</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">9. Host is the final boss</h3>
                            <p className="text-gray-600">
                                The judgment of correct or wrong is decided by judge and every one should follow her judgment                             </p>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-900 to-gray-800 rounded-2xl p-8 shadow-lg text-white">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                            <span className="text-3xl">🏆</span> Point Values
                        </h2>
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="bg-white/10 rounded-xl p-5 border border-white/10 backdrop-blur-sm">
                                <div className="text-green-400 font-bold text-lg mb-1">Easy</div>
                                <div className="text-3xl font-extrabold text-white mb-2">5 <span className="text-sm font-normal text-gray-300">pts</span></div>
                            </div>
                            <div className="bg-white/10 rounded-xl p-5 border border-white/10 backdrop-blur-sm">
                                <div className="text-orange-400 font-bold text-lg mb-1">Medium</div>
                                <div className="text-3xl font-extrabold text-white mb-2">10 <span className="text-sm font-normal text-gray-300">pts</span></div>
                            </div>
                            <div className="bg-white/10 rounded-xl p-5 border border-white/10 backdrop-blur-sm">
                                <div className="text-red-400 font-bold text-lg mb-1">Hard</div>
                                <div className="text-3xl font-extrabold text-white mb-2">15 <span className="text-sm font-normal text-gray-300">pts</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="text-center py-8">
                        <p className="text-xl text-gray-500 font-medium italic">
                            Play fair, stay respectful, and let the best team win.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
