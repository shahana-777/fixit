import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PlusCircle, 
  BookOpen, 
  MessageSquare, 
  WifiOff, 
  Home, 
  Menu, 
  X, 
  Send, 
  CheckCircle2, 
  UserCircle 
} from 'lucide-react';
import { cn } from './lib/utils';
import mathsData from './data/maths_data.json';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';

// --- Types ---
interface Question {
  q: string;
  a: string;
}

interface QuizData {
  id: string;
  questions: Question[];
  createdAt: number;
}

// --- Components ---

// --- Logo Component ---
const Logo = ({ className, size = "md" }: { className?: string, size?: "sm" | "md" | "lg" }) => {
  const dimensions = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-20 h-20"
  }[size];

  return (
    <div className={cn("relative flex items-center justify-center", dimensions, className)}>
      <svg viewBox="0 0 100 100" className="w-full h-full fill-current">
        <circle cx="50" cy="50" r="48" className="text-slate-900" />
        <circle cx="50" cy="50" r="44" fill="none" stroke="white" strokeWidth="1.5" />
        
        {/* Puzzle Pieces Group */}
        <g transform="translate(25, 25) scale(0.5)">
          {/* Piece 1: Bottom Left */}
          <path d="M10 50 L10 90 L50 90 L50 75 A10 10 0 1 1 50 55 L50 50 L25 50 A10 10 0 1 0 10 50 Z" fill="white" />
          {/* Piece 2: Bottom Right */}
          <path d="M55 90 L95 90 L95 65 A10 10 0 1 0 95 45 L95 40 L70 40 A10 10 0 1 1 50 40 L50 65 A10 10 0 1 0 50 85 L55 90 Z" fill="white" />
          {/* Piece 3: Top Left */}
          <path d="M10 45 L10 5 A10 10 0 1 1 25 5 L50 5 L50 45 L35 45 A10 10 0 1 0 15 45 L10 45 Z" fill="white" />
          {/* Piece 4: Floating Top Right */}
          <g transform="translate(10, -15) rotate(15)">
            <path d="M55 35 L95 35 L95 5 A10 10 0 1 0 75 5 L55 5 L55 20 A10 10 0 1 1 55 35 Z" fill="white" />
          </g>
        </g>
        
        {/* Text Area */}
        <text x="50" y="85" textAnchor="middle" fill="white" style={{ fontSize: '12px', fontWeight: 'bold', fontFamily: 'Inter' }}>
          — FIX IT —
        </text>
      </svg>
    </div>
  );
};

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: any, 
  label: string, 
  active: boolean, 
  onClick: () => void 
}) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
      active 
        ? "bg-blue-50 text-blue-600 shadow-sm" 
        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
    )}
  >
    <Icon size={20} strokeWidth={active ? 2.5 : 2} />
    <span className="font-medium text-sm">{label}</span>
  </button>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Quiz Create State
  const [newQuizQuestions, setNewQuizQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState('');
  const [currentA, setCurrentA] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [autoGenerateCount, setAutoGenerateCount] = useState(5);

  // Quiz Attend State
  const [attendCode, setAttendCode] = useState('');
  const [activeQuiz, setActiveQuiz] = useState<QuizData | null>(null);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [quizResult, setQuizResult] = useState<{ score: number, total: number } | null>(null);
  const [availableQuizzes, setAvailableQuizzes] = useState<QuizData[]>([]);

  // Offline Mode State
  const [offlineSearch, setOfflineSearch] = useState('');
  const [offlineResult, setOfflineResult] = useState<any[]>([]);

  // AI Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  // Initialize Gemini
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  // Load available quizzes when component mounts or when attend tab is active
  useEffect(() => {
    if (activeTab === 'attend') {
      loadAvailableQuizzes();
    }
  }, [activeTab]);

  // --- Handlers ---

  const handleAddQuestion = () => {
    if (currentQ.trim() && currentA.trim()) {
      setNewQuizQuestions([...newQuizQuestions, { q: currentQ, a: currentA }]);
      setCurrentQ('');
      setCurrentA('');
    }
  };

  const handleAutoGenerateQuiz = () => {
    const shuffled = [...mathsData].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, autoGenerateCount);
    const questions = selected.map(item => ({
      q: `Based on ${item.meta_information.chapter}: ${item.meta_information.subtopic}\n\n${item.prompt.substring(0, 200)}...`,
      a: item.completion.substring(0, 100) + "..."
    }));
    setNewQuizQuestions(questions);
  };

  const handleGenerateQuiz = () => {
    if (newQuizQuestions.length === 0) {
      alert("Please add questions or auto-generate them first");
      return;
    }
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    const quizData = { id: code, questions: newQuizQuestions, createdAt: Date.now() };
    localStorage.setItem(`quiz_${code}`, JSON.stringify(quizData));
    setGeneratedCode(code);
    setNewQuizQuestions([]);
  };

  const loadAvailableQuizzes = () => {
    const quizzes: QuizData[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('quiz_')) {
        const data = localStorage.getItem(key);
        if (data) {
          quizzes.push(JSON.parse(data));
        }
      }
    }
    setAvailableQuizzes(quizzes.sort((a, b) => b.createdAt - a.createdAt));
  };

  const handleJoinQuiz = () => {
    const data = localStorage.getItem(`quiz_${attendCode.toUpperCase()}`);
    if (data) {
      const quiz: QuizData = JSON.parse(data);
      setActiveQuiz(quiz);
      setUserAnswers(new Array(quiz.questions.length).fill(''));
      setQuizResult(null);
    } else {
      alert("Invalid Quiz Code");
    }
  };

  const handleSelectQuiz = (quiz: QuizData) => {
    setActiveQuiz(quiz);
    setUserAnswers(new Array(quiz.questions.length).fill(''));
    setQuizResult(null);
  };

  const handleSubmitQuiz = () => {
    if (!activeQuiz) return;
    let score = 0;
    activeQuiz.questions.forEach((q, i) => {
      if (userAnswers[i].toLowerCase().trim() === q.a.toLowerCase().trim()) {
        score++;
      }
    });
    setQuizResult({ score, total: activeQuiz.questions.length });
  };

  const handleOfflineSearch = (val: string) => {
    setOfflineSearch(val);
    if (val.length < 3) {
      setOfflineResult([]);
      return;
    }
    const results = mathsData.filter(item => 
      item.prompt.toLowerCase().includes(val.toLowerCase()) || 
      item.completion.toLowerCase().includes(val.toLowerCase())
    );
    setOfflineResult(results);
  };

  const handleAskAI = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    setIsThinking(true);

    try {
      const result = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: userMsg,
        config: {
          systemInstruction: "You are the Fixit Mathematical Logic Synthesizer. Provide extremely precise, step-by-step mathematical proofs and logic mappings. Use LaTeX for formulas if appropriate. Maintain a professional, technical tone.",
        }
      });
      setChatMessages(prev => [...prev, { role: 'ai', content: result.text || 'Sorry, I encountered a synthesis error.' }]);
    } catch (error) {
      console.error(error);
      setChatMessages(prev => [...prev, { role: 'ai', content: 'AI connection encountered an obstacle. Please verify the environment.' }]);
    } finally {
      setIsThinking(false);
    }
  };

  // --- UI Sections ---

  const renderHome = () => (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="relative isolate">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
              Platform v3.0
            </div>
            <h2 className="text-6xl font-black tracking-tightest leading-[0.9] text-slate-900">
              BUILD. <br/>TEST. <br/>FIX.
            </h2>
            <p className="text-slate-500 text-lg max-w-md font-medium leading-relaxed">
              Fixit is the premier analytical environment for rapid mathematical 
              synthesis and automated assessment.
            </p>
            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => setActiveTab('create')}
                className="btn-primary"
              >
                Synthesize Quiz
              </button>
              <button 
                onClick={() => setActiveTab('offline')}
                className="px-6 py-3 rounded-xl border border-slate-200 font-bold text-sm uppercase tracking-widest text-slate-900 hover:bg-slate-50 transition-all"
              >
                Local Docs
              </button>
            </div>
          </div>
          <div className="hidden lg:block relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-200 to-transparent rounded-3xl -rotate-3 scale-105 opacity-50" />
            <div className="pro-card aspect-square bg-slate-900 flex items-center justify-center relative overflow-hidden group">
              <Logo size="lg" className="scale-150 opacity-20 absolute -right-4 -bottom-4 rotate-12 group-hover:rotate-45 transition-transform duration-1000" />
              <Logo size="lg" className="scale-110 drop-shadow-2xl" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-slate-100">
        {[
          { title: "Automated Logic", desc: "AI-driven generation of complex grade-specific problem sets.", icon: CheckCircle2, tab: 'create' },
          { title: "Encrypted Sessions", desc: "Unique access keys for isolated peer-to-peer assessment environments.", icon: BookOpen, tab: 'attend' },
          { title: "Edge Knowledge", desc: "Local retrieval of over 4,000 curated mathematical theorems.", icon: WifiOff, tab: 'offline' }
        ].map((feat, idx) => (
          <div key={idx} className="space-y-4 group cursor-pointer" onClick={() => setActiveTab(feat.tab)}>
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
              <feat.icon size={20} />
            </div>
            <h3 className="font-black text-xs uppercase tracking-widest text-slate-900">{feat.title}</h3>
            <p className="text-slate-500 text-sm leading-relaxed">{feat.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCreate = () => (
    <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 border-b border-slate-100 pb-8">
        <div className="space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol 04</span>
          <h2 className="text-4xl font-black tracking-tightest leading-none text-slate-900 uppercase">SYNTHESIZE</h2>
          <p className="text-slate-500 text-sm font-medium">Define logic parameters for target evaluation.</p>
        </div>
        {generatedCode && (
          <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center gap-4 group">
            <div className="space-y-0.5">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Access Key</span>
              <span className="text-xl font-bold tracking-[0.2em] block leading-none">{generatedCode}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors cursor-pointer" onClick={() => navigator.clipboard.writeText(generatedCode)}>
              <Send size={14} className="rotate-45" />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="pro-card overflow-hidden">
          <div className="bg-slate-50 px-6 py-2 border-b border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Requirement Definition</span>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Validation String (Question)</label>
              <textarea
                value={currentQ}
                onChange={(e) => setCurrentQ(e.target.value)}
                className="input-field h-32 resize-none bg-slate-50/50"
                placeholder="PROMPT_01: Input mathematical condition..."
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Key Value (Answer)</label>
              <input
                type="text"
                value={currentA}
                onChange={(e) => setCurrentA(e.target.value)}
                className="input-field bg-slate-50/50"
                placeholder="EXPECTED_RESULT..."
              />
            </div>
            <div className="grid grid-cols-3 gap-4 pt-2">
              <button 
                onClick={handleAddQuestion}
                className="btn-primary bg-slate-100 text-slate-900 border border-slate-200 hover:bg-slate-200 py-4 h-auto"
              >
                <PlusCircle size={16} />
                <span>Buffer Query</span>
              </button>
              <button 
                onClick={handleAutoGenerateQuiz}
                className="btn-primary bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 py-4 h-auto"
              >
                <PlusCircle size={16} />
                <span>Auto Generate</span>
              </button>
              <button 
                onClick={handleGenerateQuiz}
                disabled={newQuizQuestions.length === 0}
                className="btn-primary py-4 h-auto disabled:bg-slate-100 disabled:text-slate-400"
              >
                Assemble Set
              </button>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Auto Generate Count</label>
              <div className="flex gap-2">
                {[3, 5, 10].map(count => (
                  <button
                    key={count}
                    onClick={() => setAutoGenerateCount(count)}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                      autoGenerateCount === count
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {newQuizQuestions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
               <div className="h-px bg-slate-200 flex-1" />
               <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] whitespace-nowrap">Assembled Buffer ({newQuizQuestions.length})</span>
               <div className="h-px bg-slate-200 flex-1" />
            </div>
            <div className="grid grid-cols-1 gap-3">
              {newQuizQuestions.map((q, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  key={i} 
                  className="pro-card p-4 flex justify-between items-center group bg-white/80"
                >
                  <div className="flex gap-4 items-center">
                    <span className="text-[10px] font-black text-slate-300">{idx_map(i+1)}</span>
                    <p className="text-sm font-bold text-slate-600 truncate max-w-sm">{q.q}</p>
                  </div>
                  <button 
                    onClick={() => setNewQuizQuestions(newQuizQuestions.filter((_, idx) => idx !== i))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const idx_map = (num: number) => num < 10 ? `0${num}` : num;

  const renderAttend = () => (
    <div className="max-w-2xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-6">
      {!activeQuiz ? (
        <div className="space-y-12">
          <div className="text-center py-12 space-y-8">
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 bg-slate-900 rounded-3xl rotate-12 opacity-5" />
              <div className="relative bg-white border border-slate-200 w-full h-full rounded-2xl flex items-center justify-center text-slate-900 shadow-sm">
                <BookOpen size={40} />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-4xl font-black tracking-tightest uppercase text-slate-900">AVAILABLE SESSIONS</h2>
              <p className="text-slate-500 font-medium tracking-tight">Select a quiz to attend or enter a custom access code.</p>
            </div>
          </div>

          {availableQuizzes.length > 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ACTIVE QUIZZES ({availableQuizzes.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableQuizzes.map((quiz) => (
                  <motion.div
                    key={quiz.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="pro-card group cursor-pointer hover:bg-slate-900 hover:text-white transition-all"
                    onClick={() => handleSelectQuiz(quiz)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black bg-slate-100 px-2 py-0.5 rounded">SESSION_ID</span>
                          <span className="text-lg font-black">{quiz.id}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-slate-400">{quiz.questions.length} Questions</span>
                          <span className="text-slate-400">
                            {new Date(quiz.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-white/20 flex items-center justify-center transition-all">
                        <Send size={14} className="rotate-45" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <div className="text-center py-8 border-t border-slate-100">
            <div className="space-y-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OR ENTER CUSTOM CODE</span>
              <div className="flex bg-white p-2 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 max-w-sm mx-auto">
                <input 
                  type="text" 
                  value={attendCode}
                  onChange={(e) => setAttendCode(e.target.value)}
                  placeholder="SESSION_ID"
                  className="bg-transparent px-4 py-3 outline-none flex-1 uppercase font-black tracking-[0.3em] placeholder:font-bold placeholder:tracking-widest placeholder:text-slate-300"
                />
                <button 
                  onClick={handleJoinQuiz}
                  className="btn-primary px-8"
                >
                  Link
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 pb-20">
          <div className="flex justify-between items-end border-b-2 border-slate-900 pb-6">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Link</span>
              <h2 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">{activeQuiz.id}</h2>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest leading-none mt-1">Status: EVALUATING_IN_PROGRESS</p>
            </div>
            <button onClick={() => setActiveQuiz(null)} className="px-4 py-2 bg-slate-100 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all font-black text-[10px] uppercase tracking-widest">
              Terminate
            </button>
          </div>

          <div className="space-y-12">
            {activeQuiz.questions.map((q, i) => (
              <div key={i} className="space-y-6">
                <div className="flex gap-6 items-start">
                  <span className="text-4xl font-black text-slate-200 tabular-nums">/{idx_map(i+1)}</span>
                  <div className="space-y-4 flex-1 pt-2">
                    <p className="text-lg font-bold text-slate-900 leading-snug">{q.q}</p>
                    <div className="relative group">
                      <div className="absolute -left-3 top-0 bottom-0 w-1 bg-slate-100 group-focus-within:bg-slate-900 transition-colors" />
                      <input 
                        type="text" 
                        value={userAnswers[i] || ''}
                        onChange={(e) => {
                          const newAns = [...userAnswers];
                          newAns[i] = e.target.value;
                          setUserAnswers(newAns);
                        }}
                        placeholder="INPUT_ANSWER_0x..."
                        className="w-full bg-transparent border-none outline-none py-2 text-xl font-medium placeholder:text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-12 border-t border-slate-100">
            <button 
              onClick={handleSubmitQuiz}
              className="w-full btn-primary h-20 text-sm uppercase tracking-[0.3em] font-black shadow-2xl shadow-slate-900/10"
            >
              SUBMIT DATA FOR VALIDATION
            </button>
          </div>
        </motion.div>
      )}

      {quizResult && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] p-12 max-w-md w-full text-center space-y-8 shadow-2xl"
          >
            <div className="w-24 h-24 bg-slate-900 text-white rounded-3xl flex items-center justify-center mx-auto rotate-12 hover:rotate-0 transition-transform duration-500 shadow-xl">
              <CheckCircle2 size={48} />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tightest leading-none uppercase">VALIDATION_SUCCESS</h2>
              <p className="text-slate-400 font-medium text-sm leading-relaxed">Neural processing of your input string has completed. Output report generated below.</p>
            </div>
            <div className="py-10 border-y border-slate-100">
              <div className="flex items-end justify-center gap-2">
                <span className="text-7xl font-black text-slate-900 tracking-tighter leading-none">{quizResult.score}</span>
                <span className="text-3xl text-slate-300 font-black tracking-tighter mb-1">/{quizResult.total}</span>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Precision Index</p>
            </div>
            <button 
              onClick={() => {
                setActiveQuiz(null);
                setQuizResult(null);
              }}
              className="w-full btn-primary py-5 text-xs uppercase tracking-[0.3em]"
            >
              Return to Control
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );

  const renderOffline = () => (
    <div className="max-w-4xl space-y-10 animate-in fade-in slide-in-from-bottom-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] bg-slate-100 px-2 py-0.5 rounded">SYSTEM_RELIANCE_0</span>
          <WifiOff size={14} className="text-slate-400" />
        </div>
        <h2 className="text-5xl font-black tracking-tightest leading-none text-slate-900 uppercase">DOCUMENT_RETRIEVAL</h2>
        <p className="text-slate-500 font-medium">Local knowledge cluster for NCERT architectural standards.</p>
      </div>

      <div className="relative group">
        <div className="absolute inset-0 bg-slate-900 rounded-2xl scale-[1.01] blur-md opacity-0 group-focus-within:opacity-5 transition-opacity" />
        <input 
          type="text"
          value={offlineSearch}
          onChange={(e) => handleOfflineSearch(e.target.value)}
          placeholder="SEARCH_QUERY: {keyword, grade, topic}"
          className="relative w-full pl-14 pr-4 py-5 rounded-2xl border border-slate-200 shadow-xl shadow-slate-100 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-xl font-bold placeholder:text-slate-200 bg-white"
        />
        <Menu className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 rotate-90" size={24} />
      </div>

      <div className="grid grid-cols-1 gap-6 pb-20">
        {offlineResult.length > 0 ? (
          offlineResult.map((res, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="pro-card group"
            >
              <div className="bg-slate-50 px-8 py-4 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">
                    DOC_ID: GRADE_{res.meta_information.class}_{res.meta_information.chapter.substring(0,3).toUpperCase()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-[9px] font-black bg-white border border-slate-200 px-3 py-1 rounded-full text-slate-500 uppercase tracking-widest">
                    {res.meta_information.subtopic}
                  </span>
                </div>
              </div>
              <div className="p-8 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-px bg-slate-200" />
                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">INPUT_PROMPT</h4>
                    <span className="flex-1 h-px bg-slate-200" />
                  </div>
                  <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                    <p className="text-sm italic font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">{res.prompt}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-px bg-slate-900" />
                    <h4 className="text-[9px] font-black text-slate-900 uppercase tracking-[0.2em] whitespace-nowrap">EXTRACTED_LOGIC</h4>
                    <span className="flex-1 h-px bg-slate-900/10" />
                  </div>
                  <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-base font-bold text-slate-900 leading-relaxed whitespace-pre-wrap">{res.completion}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : offlineSearch.length >= 3 ? (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <p className="text-slate-400 text-sm font-black uppercase tracking-widest">No exact matches found in local repository.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            {['Calculus', 'Linear Equations', 'Symmetry', 'Volumes', 'Interest', 'Indices'].map(topic => (
              <button 
                key={topic} 
                onClick={() => handleOfflineSearch(topic)}
                className="pro-card p-10 text-center hover:bg-slate-900 hover:text-white transition-all duration-300 group relative overflow-hidden"
              >
                <div className="relative z-10 space-y-4">
                  <BookOpen size={32} className="mx-auto text-slate-200 group-hover:text-white/20 transition-colors" />
                  <span className="block font-black text-xs uppercase tracking-widest">{topic}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderChat = () => (
    <div className="h-[calc(100vh-10rem)] flex flex-col space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      <div className="flex-1 overflow-y-auto space-y-8 pr-4 scrollbar-hide">
        {chatMessages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-30">
            <div className="w-20 h-20 rounded-[2rem] bg-slate-900 flex items-center justify-center text-white scale-110">
              <MessageSquare size={32} />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-black uppercase tracking-tightest">Synthesizer Interface</p>
              <p className="max-w-xs text-sm font-medium">Input complex mathematical queries for instant logic mapping.</p>
            </div>
          </div>
        )}
        {chatMessages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] px-6 py-4 rounded-[1.5rem] shadow-sm",
              msg.role === 'user' 
                ? "bg-slate-900 text-white rounded-br-none" 
                : "bg-white border border-slate-200 text-slate-900 rounded-bl-none shadow-slate-100"
            )}>
              <div className={cn("prose prose-sm", msg.role === 'user' ? "prose-invert" : "prose-slate")}>
                <Markdown>{msg.content}</Markdown>
              </div>
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 px-6 py-4 rounded-[1.5rem] rounded-bl-none flex items-center gap-3">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-slate-900 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-slate-900 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-slate-900 rounded-full animate-bounce" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Processing</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 items-center bg-white p-2 rounded-[2rem] border border-slate-200 shadow-2xl shadow-slate-200/50">
        <input 
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
          placeholder="COMMAND_INPUT..."
          className="flex-1 px-6 h-14 bg-transparent outline-none text-sm font-bold uppercase tracking-widest placeholder:text-slate-200"
        />
        <button 
          onClick={handleAskAI}
          disabled={isThinking || !chatInput.trim()}
          className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-20 disabled:scale-100"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );

  const renderAuth = () => (
    <div className="fixed inset-0 bg-slate-50 z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full py-12"
      >
        <div className="text-center space-y-6 mb-8">
          <Logo size="lg" className="mx-auto drop-shadow-xl" />
          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tighter text-slate-900">FIXIT</h2>
            <p className="text-slate-500 font-medium">Precision learning for the next generation of engineers.</p>
          </div>
        </div>

        <div className="pro-card p-1 shadow-2xl shadow-slate-200/50 bg-white">
          <div className="p-8 space-y-6">
            <div className="flex bg-slate-50 p-1.5 rounded-2xl">
              <button 
                onClick={() => setAuthMode('login')}
                className={cn(
                  "flex-1 py-3 text-sm font-bold rounded-xl transition-all", 
                  authMode === 'login' ? "bg-white shadow-sm text-slate-900 ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Sign In
              </button>
              <button 
                onClick={() => setAuthMode('signup')}
                className={cn(
                  "flex-1 py-3 text-sm font-bold rounded-xl transition-all", 
                  authMode === 'signup' ? "bg-white shadow-sm text-slate-900 ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Sign Up
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                <input type="email" placeholder="name@learning.com" className="input-field bg-slate-50/50 border-slate-200" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Token</label>
                <input type="password" placeholder="••••••••••••" className="input-field bg-slate-50/50 border-slate-200" />
              </div>
              <button 
                onClick={() => setIsLoggedIn(true)}
                className="w-full btn-primary h-14 text-sm uppercase tracking-[0.2em] font-black mt-2"
              >
                {authMode === 'login' ? 'Authenticate' : 'Establish Identity'}
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-10 text-center">
          <button 
            onClick={() => setIsLoggedIn(true)}
            className="text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-900 transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            Bypass Authentication <Send size={12} />
          </button>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      {!isLoggedIn && renderAuth()}
      
      {/* Sidebar Navigation */}
      <aside 
        className={cn(
          "bg-white border-r border-slate-200 h-screen transition-all duration-300 ease-in-out z-40 fixed lg:static",
          isSidebarOpen ? "w-64" : "w-0 lg:w-20 overflow-hidden"
        )}
      >
        <div className="h-full flex flex-col p-4">
          <div className="flex items-center gap-3 px-2 mb-10 overflow-hidden">
            <Logo size="sm" />
            <span className="text-xl font-bold tracking-tight text-slate-900">Fixit</span>
          </div>

          <nav className="flex-1 space-y-1">
            <SidebarItem icon={Home} label="Dashboard" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
            <div className="h-px bg-slate-100 my-4" />
            <SidebarItem icon={PlusCircle} label="Create Quiz" active={activeTab === 'create'} onClick={() => setActiveTab('create')} />
            <SidebarItem icon={BookOpen} label="Attend Quiz" active={activeTab === 'attend'} onClick={() => setActiveTab('attend')} />
            <SidebarItem icon={WifiOff} label="Offline Mode" active={activeTab === 'offline'} onClick={() => setActiveTab('offline')} />
            <SidebarItem icon={MessageSquare} label="AI Chat" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
          </nav>

          <button 
            onClick={() => setIsLoggedIn(false)}
            className="mt-auto flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-600 transition-colors"
          >
            <X size={20} />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto relative">
        <header className="sticky top-0 bg-slate-50/80 backdrop-blur-md px-6 h-16 flex items-center justify-between z-30 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <Logo size="sm" className="lg:hidden" />
          </div>
          
          <div className="flex items-center gap-4 ml-auto">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status</p>
              <p className="text-xs font-bold text-emerald-600 leading-none flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Edge Synced
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 overflow-hidden shadow-sm">
               <UserCircle size={28} />
            </div>
          </div>
        </header>

        <div className="p-6 md:p-10 max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {renderHome()}
              </motion.div>
            )}
            {activeTab === 'create' && (
              <motion.div key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {renderCreate()}
              </motion.div>
            )}
            {activeTab === 'attend' && (
              <motion.div key="attend" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {renderAttend()}
              </motion.div>
            )}
            {activeTab === 'offline' && (
              <motion.div key="offline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {renderOffline()}
              </motion.div>
            )}
            {activeTab === 'chat' && (
              <motion.div key="chat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {renderChat()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
