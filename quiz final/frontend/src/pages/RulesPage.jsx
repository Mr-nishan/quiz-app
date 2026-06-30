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
                        Quiz Manual & Rules
                    </h1>
                    <div className="w-20"></div> {/* Spacer for centering */}
                </div>

                <div className="space-y-8">
                    {/* Welcome Section */}
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                <span className="text-2xl">👋</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-3">Welcome to the Ultimate Quiz!</h2>
                                <p className="text-gray-600 leading-relaxed">
                                    Get ready to test your knowledge, speed, and teamwork. Our interactive quiz system is designed for high-stakes competition. Here is everything you need to know to play and win!
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Core Rules Grid */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Turns */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="text-3xl mb-4">🎲</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">1. Taking Turns & Rotation</h3>
                            <p className="text-gray-600">
                                Teams take turns sequentially picking questions from the board. The selection rotates cyclically through the teams. When it's your team's turn, you must choose a category/difficulty and a question number.
                            </p>
                        </div>

                        {/* Timing */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="text-3xl mb-4">⏱️</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">2. The 40-Second Rule</h3>
                            <p className="text-gray-600">
                                Once a question is revealed, the clock starts ticking! Your team has exactly <span className="font-bold text-red-500">40 seconds</span> to provide the correct answer.
                            </p>
                        </div>
                        
                        {/* Stealing */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="text-3xl mb-4">🥷</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">3. Rotation Time on Steal</h3>
                            <p className="text-gray-600">
                                If the active team gets it wrong or runs out of time, the chance to answer immediately rotates to the next team in line. This stealing team gets a full <span className="font-bold text-red-500">40 seconds</span> of rotation time to answer! This rotation continues until someone gets it right or all teams fail.
                            </p>
                        </div>

                        {/* Host Power */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="text-3xl mb-4">👑</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">4. Host Decisions are Final</h3>
                            <p className="text-gray-600">
                                The host judges whether an answer is correct or wrong. No arguing with the host—their word is absolute law!
                            </p>
                        </div>
                    </div>

                    {/* Points System */}
                    <div className="bg-gradient-to-br from-slate-900 to-gray-800 rounded-2xl p-8 shadow-lg text-white">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                            <span className="text-3xl">🏆</span> Points System
                        </h2>
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="bg-white/10 rounded-xl p-5 border border-white/10 backdrop-blur-sm">
                                <div className="text-green-400 font-bold text-lg mb-1">Easy Questions</div>
                                <div className="text-3xl font-extrabold text-white mb-2">5 <span className="text-sm font-normal text-gray-300">pts</span></div>
                                <p className="text-gray-300 text-sm">Perfect for warming up and getting on the scoreboard.</p>
                            </div>
                            <div className="bg-white/10 rounded-xl p-5 border border-white/10 backdrop-blur-sm">
                                <div className="text-orange-400 font-bold text-lg mb-1">Medium Questions</div>
                                <div className="text-3xl font-extrabold text-white mb-2">10 <span className="text-sm font-normal text-gray-300">pts</span></div>
                                <p className="text-gray-300 text-sm">Requires some thinking. High risk, high reward.</p>
                            </div>
                            <div className="bg-white/10 rounded-xl p-5 border border-white/10 backdrop-blur-sm">
                                <div className="text-red-400 font-bold text-lg mb-1">Hard Questions</div>
                                <div className="text-3xl font-extrabold text-white mb-2">15 <span className="text-sm font-normal text-gray-300">pts</span></div>
                                <p className="text-gray-300 text-sm">Only for the brave! Can turn the tide of the game instantly.</p>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Encouragement */}
                    <div className="text-center py-8">
                        <p className="text-xl text-gray-500 font-medium italic">
                            "May the best team win. Good luck!"
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
