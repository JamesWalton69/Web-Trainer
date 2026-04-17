import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, PlusCircle, Activity, Calendar, Flame, LogOut,
  TrendingUp, Zap, Award, Edit2, Trash2, Dumbbell, Sparkles, X, Save
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { getDailyQuote } from '../lib/quotes';
import {
  buildChartData, buildStreakCalendar, getCustomWorkouts, deleteCustomWorkout, saveCustomWorkout
} from '../lib/firestoreService';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

export default function Dashboard() {
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName') || 'Athlete';
  const userPhoto = localStorage.getItem('userPhoto');
  const userId = localStorage.getItem('userId');
  const dailyQuote = getDailyQuote();

  const [stats, setStats] = useState(null);
  const [badges, setBadges] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [streakCells, setStreakCells] = useState([]);
  const [customRoutines, setCustomRoutines] = useState([]);
  const [loading, setLoading] = useState(true);

  // AI Modal State
  const [showAIModal, setShowAIModal] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('geminiApiKey') || '');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    async function loadData() {
      const sessions = await getWorkoutHistory(userId);
      const computedStats = computeStats(sessions);
      const computedBadges = computeBadges(computedStats, sessions);
      const chart = buildChartData(sessions);
      const calendar = buildStreakCalendar(computedStats.completedDates);
      const routines = await getCustomWorkouts(userId);

      setStats(computedStats);
      setBadges(computedBadges);
      setChartData(chart);
      setStreakCells(calendar);
      setCustomRoutines(routines);
      setLoading(false);
    }
    loadData();
  }, [userId]);

  const handleLogout = async () => {
    try { await signOut(auth); } catch (e) { console.error('Logout error:', e); }
    localStorage.clear();
    navigate('/');
  };

  const handleDeleteRoutine = async (e, routineId) => {
      e.stopPropagation();
      if (!window.confirm('Delete this routine?')) return;
      await deleteCustomWorkout(userId, routineId);
      setCustomRoutines(customRoutines.filter(r => r.id !== routineId));
  };

  const handleGenerateAIWorkout = async () => {
      if (!apiKey) {
          alert("Please enter a valid Gemini API Key first.");
          return;
      }
      if (!aiPrompt) return;
      
      localStorage.setItem('geminiApiKey', apiKey);
      setAiGenerating(true);
      
      try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  contents: [{ parts: [{ 
                      text: `You are a fitness coach. The user wants a workout based on this prompt: '${aiPrompt}'. Create a routine and output ONLY valid JSON without any markdown formatting. The JSON must be an array of exercise objects, each containing: 'name' (string), 'reps' (number), 'tension' (seconds to hold, number), 'reset' (seconds to prepare next rep, number, min 0.2), 'gif' (string, empty). Make sure tension is reasonable for the exercise (1-3s for dynamic, 10-60s for static holds). Example array output: [{"name": "Squats", "reps": 15, "tension": 2, "reset": 0.5, "gif": ""}]`
                  }]}]
              })
          });
          
          if (!response.ok) throw new Error("API Request Failed. Check your key.");
          
          const data = await response.json();
          let jsonText = data.candidates[0].content.parts[0].text;
          jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
          
          const parsedRoutine = JSON.parse(jsonText);
          
          const newRoutineId = await saveCustomWorkout(userId, null, "AI: " + aiPrompt.slice(0, 20) + (aiPrompt.length > 20 ? '...' : ''), parsedRoutine, { sets: 3, restBetweenSet: 60, restBetweenEx: 35, prepTime: 10 });
          if (newRoutineId) {
             const routines = await getCustomWorkouts(userId);
             setCustomRoutines(routines);
             setShowAIModal(false);
             setAiPrompt('');
          }
      } catch (err) {
          console.error(err);
          alert("Failed to generate workout. Ensure your prompt is clear and API key is valid.");
      } finally {
          setAiGenerating(false);
      }
  };

  const firstName = userName.split(' ')[0];
  const weeklyGoal = 150;
  const weeklyProgress = stats ? Math.min((stats.weeklyMinutes / weeklyGoal) * 100, 100) : 0;
  const circumference = 2 * Math.PI * 52;
  const dashOffset = circumference - (weeklyProgress / 100) * circumference;

  return (
    <div className="page">
      <div className="animated-bg" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <div className="container" style={{ padding: '1.5rem', maxWidth: '1100px' }}>
        {/* HEADER */}
        <header className="animate-fade-up" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {userPhoto ? (
              <img src={userPhoto} alt="avatar" className="avatar" referrerPolicy="no-referrer" />
            ) : (
              <div className="avatar" style={{
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', fontWeight: 700, color: 'white',
              }}>
                {firstName[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <h2 style={{ fontSize: '1.5rem' }}>Welcome, {firstName}! 👋</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {loading ? 'Loading progress...' : `Level ${stats?.level || 1} · ${stats?.streak || 0} day streak`}
              </p>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={handleLogout}>
            <LogOut size={18} /> Logout
          </button>
        </header>

        {/* DAILY QUOTE */}
        <div className="animate-fade-up delay-1">
          <div className="quote-card" style={{ marginBottom: '1.5rem' }}>
            "{dailyQuote.text}"
            <span className="quote-author">— {dailyQuote.author}</span>
          </div>
        </div>

        {/* PROGRESS RING AND STATS */}
        <div className="animate-fade-up delay-2" style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem', marginBottom: '1.5rem',
        }}>
          <div className="glass" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gridRow: 'span 2',
          }}>
            <div className="countdown-container">
              <svg width="130" height="130" className="progress-ring">
                <circle className="progress-ring__circle-bg" cx="65" cy="65" r="52" strokeWidth="8" />
                <circle
                  className="progress-ring__circle"
                  cx="65" cy="65" r="52" strokeWidth="8"
                  stroke="url(#progressGradient)"
                  strokeDasharray={circumference}
                  strokeDashoffset={loading ? circumference : dashOffset}
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--primary)" />
                    <stop offset="100%" stopColor="var(--accent)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="countdown-text" style={{ fontSize: '1.1rem' }}>
                {loading ? '...' : `${Math.round(weeklyProgress)}%`}
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.5rem' }}>Weekly Goal</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
              {loading ? '...' : `${Math.round(stats?.weeklyMinutes || 0)} / ${weeklyGoal} min`}
            </p>
          </div>

          <div className="glass stat-card stat-purple" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(108, 99, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={22} color="var(--primary-light)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.4rem' }}>{loading ? '—' : stats?.level || 1}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Level</p>
            </div>
          </div>

          <div className="glass stat-card stat-pink" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(255, 107, 157, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Flame size={22} color="var(--neon-pink)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.4rem' }}>{loading ? '—' : `${stats?.streak || 0}d`}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Streak</p>
            </div>
          </div>

          <div className="glass stat-card stat-green" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(0, 212, 170, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={22} color="var(--accent)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.4rem' }}>{loading ? '—' : `${Math.round(stats?.totalMinutes || 0)}m`}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Total Active</p>
            </div>
          </div>

          <div className="glass stat-card stat-orange" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(255, 140, 66, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={22} color="var(--neon-orange)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.4rem' }}>{loading ? '—' : stats?.totalSessions || 0}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Sessions</p>
            </div>
          </div>
        </div>

        {/* CUSTOM ROUTINES SECTION */}
        <div className="animate-fade-up delay-3" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem' }}>
                <Dumbbell size={20} style={{ verticalAlign: 'middle', marginRight: '0.5rem', color: 'var(--primary-light)' }} />
                Your Routines
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary" onClick={() => setShowAIModal(true)} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                      <Sparkles size={16} style={{ marginRight: '0.5rem', color: 'var(--neon-pink)' }} /> AI Coach
                  </button>
                  <button className="btn btn-ghost" onClick={() => navigate('/build')} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                      <PlusCircle size={16} style={{ marginRight: '0.5rem' }} /> Create New
                  </button>
              </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {/* Default Quick Start */}
              <div 
                  className="glass-solid" 
                  style={{ display: 'flex', flexDirection: 'column', gap: '1rem', cursor: 'pointer', border: '1px solid rgba(0, 212, 170, 0.3)' }}
                  onClick={() => navigate('/workout', { state: { routineSettings: { sets: 3, restBetweenSet: 60, restBetweenEx: 35, prepTime: 10 } } })}
              >
                  <div>
                      <h4 style={{ color: 'var(--accent)', fontSize: '1.1rem', marginBottom: '0.25rem' }}>Standard Full Body</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>5 exercises · 3 sets · Default pacing</p>
                  </div>
                  <button className="btn btn-accent" style={{ width: '100%' }}>
                      <Play size={18} /> Start
                  </button>
              </div>

              {/* Custom Routines */}
              {!loading && customRoutines.map(routine => (
                  <div 
                      key={routine.id}
                      className="glass-solid" 
                      style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                  >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                              <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{routine.name}</h4>
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {routine.exercises?.length || 0} exercises
                              </p>
                          </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                              className="btn btn-primary" 
                              style={{ flex: 1, padding: '0.5rem' }}
                              onClick={() => navigate('/workout', { state: { routine: routine.exercises, routineName: routine.name, routineSettings: routine.settings } })}
                          >
                              <Play size={16} /> Play
                          </button>
                          <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.5rem' }}
                              onClick={() => navigate('/build', { state: { routine } })}
                              title="Edit"
                          >
                              <Edit2 size={16} />
                          </button>
                          <button 
                              className="btn btn-danger" 
                              style={{ padding: '0.5rem', background: 'rgba(255, 107, 107, 0.1)', color: 'var(--danger)' }}
                              onClick={(e) => handleDeleteRoutine(e, routine.id)}
                              title="Delete"
                          >
                              <Trash2 size={16} />
                          </button>
                      </div>
                  </div>
              ))}
          </div>
        </div>

        {/* CHART & STREAKS Row */}
        <div className="animate-fade-up delay-4" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="glass">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
                <TrendingUp size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                Activity This Week
                </h3>
                <div style={{ height: '220px', minHeight: '220px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--surface-1)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-primary)' }} formatter={(value) => [`${value} min`, 'Active Time']} />
                    <Area type="monotone" dataKey="minutes" stroke="var(--primary)" strokeWidth={3} fill="url(#chartGradient)" dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 2, stroke: 'var(--bg-deep)' }} activeDot={{ r: 6, fill: 'var(--primary-light)' }} />
                    </AreaChart>
                </ResponsiveContainer>
                </div>
            </div>

            <div className="glass">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
                <Flame size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                Last 28 Days
                </h3>
                <div className="streak-grid">
                {streakCells.map((cell, i) => (
                    <div key={i} className={`streak-cell ${cell.completed ? 'level-4' : 'empty'}`} title={`${cell.date}${cell.completed ? ' ✅' : ''}`} />
                ))}
                </div>
            </div>
        </div>

        {/* BADGES */}
        <div className="glass animate-fade-up delay-5" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
            <Award size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
            Achievements
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.75rem' }}>
            {badges.map(badge => (
              <div key={badge.id} className={`badge-card ${badge.unlocked ? 'unlocked' : 'locked'}`}>
                <span className="badge-icon">{badge.emoji}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{badge.name}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{badge.description}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* AI SMART COACH MODAL */}
      {showAIModal && (
          <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)',
              zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
          }}>
              <div className="glass animate-scale-in" style={{ width: '100%', maxWidth: '500px', position: 'relative' }}>
                  <button className="btn-icon" style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent' }} onClick={() => setShowAIModal(false)}>
                      <X size={24} />
                  </button>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Sparkles color="var(--neon-pink)" /> AI Smart Coach
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                      Describe your perfect workout, and our AI will generate a structured custom routine for you instantly.
                  </p>
                  
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label>Google Gemini API Key</label>
                      <input 
                          type="password" 
                          className="input-field" 
                          placeholder="AIzaSy..." 
                          value={apiKey} 
                          onChange={(e) => setApiKey(e.target.value)} 
                      />
                      <small style={{ color: 'var(--text-muted)' }}>Get a free key from Google AI Studio. Stored locally.</small>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                      <label>Workout Prompt</label>
                      <textarea 
                          className="input-field" 
                          rows="3" 
                          placeholder="e.g. Give me a 15-minute high intensity core workout without equipment..."
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                      />
                  </div>
                  
                  <button 
                      className="btn btn-primary" 
                      style={{ width: '100%', padding: '1rem', background: 'linear-gradient(45deg, var(--neon-pink), var(--accent))' }}
                      onClick={handleGenerateAIWorkout}
                      disabled={aiGenerating}
                  >
                      {aiGenerating ? 'Generating magic...' : 'Generate New Routine'}
                  </button>
              </div>
          </div>
      )}

    </div>
  );
}
