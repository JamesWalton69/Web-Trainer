import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, XCircle, ArrowRight, ThumbsDown, Minus, ThumbsUp, Clock, Pause as PauseIcon, Dumbbell } from 'lucide-react';
import { getRandomQuote } from '../lib/quotes';
import { logWorkoutSession } from '../lib/firestoreService';

export default function PostWorkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const summary = location.state || {
    status: 'Unknown', active_minutes: 0, pauses: 0, last_exercise: 'None'
  };

  const userId = localStorage.getItem('userId');
  const [feedback, setFeedback] = useState(null);
  const [saved, setSaved] = useState(false);
  const [quote] = useState(getRandomQuote());
  const completed = summary.status === 'Completed';

  useEffect(() => {
    // Log session to Firestore immediately
    async function save() {
      await logWorkoutSession(userId, {
        status: summary.status,
        active_minutes: summary.active_minutes,
        pauses: summary.pauses,
        last_exercise: summary.last_exercise,
        feedback: feedback,
      });
      setSaved(true);
    }
    if (!saved) save();
  }, []);

  const handleFeedback = async (value) => {
    setFeedback(value);
    // Update session with feedback
    await logWorkoutSession(userId, {
      status: summary.status,
      active_minutes: summary.active_minutes,
      pauses: summary.pauses,
      last_exercise: summary.last_exercise,
      feedback: value,
      type: 'feedback_update',
    });
  };

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="animated-bg" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <div style={{ maxWidth: '500px', width: '100%', padding: '1.5rem' }}>
        {/* Status Icon */}
        <div className="animate-scale-in" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          {completed ? (
            <>
              <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>🏆</div>
              <h1 style={{
                background: 'linear-gradient(135deg, var(--accent), var(--primary-light))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                Workout Complete!
              </h1>
            </>
          ) : (
            <>
              <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>💪</div>
              <h1 style={{ color: 'var(--neon-orange)' }}>Session Ended</h1>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Every rep counts. You showed up, and that matters.
              </p>
            </>
          )}
        </div>

        {/* Summary Card */}
        <div className="glass animate-fade-up delay-1" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>
            Session Summary
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Clock size={20} color="var(--accent)" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>{summary.active_minutes}m</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Active Time</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <PauseIcon size={20} color="var(--neon-orange)" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>{summary.pauses}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Pauses</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Dumbbell size={20} color="var(--primary-light)" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>{summary.last_exercise}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Last Exercise</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {completed ?
                <CheckCircle size={20} color="var(--accent)" /> :
                <XCircle size={20} color="var(--danger)" />
              }
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>{summary.status}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Status</div>
              </div>
            </div>
          </div>
        </div>

        {/* Adaptive Feedback */}
        <div className="glass animate-fade-up delay-2" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>How was that workout?</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
            Your feedback adjusts next session's intensity
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            {[
              { value: 'easy', icon: <ThumbsDown size={20} />, label: 'Too Easy', color: 'var(--accent)' },
              { value: 'right', icon: <Minus size={20} />, label: 'Just Right', color: 'var(--primary)' },
              { value: 'hard', icon: <ThumbsUp size={20} />, label: 'Too Hard', color: 'var(--neon-pink)' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => handleFeedback(opt.value)}
                className="btn"
                style={{
                  flex: 1,
                  flexDirection: 'column',
                  gap: '0.25rem',
                  padding: '1rem 0.5rem',
                  background: feedback === opt.value
                    ? `${opt.color}33`
                    : 'rgba(255,255,255,0.05)',
                  border: feedback === opt.value
                    ? `2px solid ${opt.color}`
                    : '2px solid rgba(255,255,255,0.1)',
                  color: feedback === opt.value ? opt.color : 'var(--text-secondary)',
                  fontSize: '0.8rem',
                }}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
          {feedback && (
            <p className="animate-fade-in" style={{
              marginTop: '0.75rem', color: 'var(--accent)', fontSize: '0.85rem'
            }}>
              {feedback === 'easy' && "💪 We'll push you harder next time!"}
              {feedback === 'right' && "✅ Perfect! Keeping the same intensity."}
              {feedback === 'hard' && "🤝 We'll ease up slightly next session."}
            </p>
          )}
        </div>

        {/* Quote */}
        <div className="animate-fade-up delay-3" style={{ marginBottom: '1.5rem' }}>
          <div className="quote-card">
            "{quote.text}"
            <span className="quote-author">— {quote.author}</span>
          </div>
        </div>

        {/* Continue Button */}
        <button
          className="btn btn-primary btn-lg animate-fade-up delay-4"
          style={{ width: '100%' }}
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}
