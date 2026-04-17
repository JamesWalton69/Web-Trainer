import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, GripVertical, RotateCcw, Wand2 } from 'lucide-react';
import { saveCustomWorkout } from '../lib/firestoreService';

const PRESET_EXERCISES = [
  "Pushups", "Incline Pushups", "Decline Pushups", "Diamond Pushups",
  "Jump Squats", "Bodyweight Squats", "Lunges", "Bulgarian Split Squats",
  "Glute Bridges", "Hip Thrusts", "Superman", "Plank",
  "Mountain Climbers", "Burpees", "Crunches", "Leg Raises",
  "Calf Raises", "Wall Sit", "Tricep Dips", "Jumping Jacks",
];

const DEFAULT_EXERCISES = [
  { name: "Incline Pushups", reps: 10, tension: 2, reset: 0.4 },
  { name: "Jump Squats", reps: 17, tension: 2, reset: 0.4 },
  { name: "Glute Bridges", reps: 15, tension: 3, reset: 0.4 },
  { name: "Superman", reps: 11, tension: 3.5, reset: 0.6 },
  { name: "Plank", reps: 1, tension: 45, reset: 10 },
];

export default function WorkoutBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const userId = localStorage.getItem('userId');
  
  const editingRoutine = location.state?.routine || null;

  const [routineName, setRoutineName] = useState(editingRoutine?.name || 'My Custom Routine');
  const [exercises, setExercises] = useState(editingRoutine?.exercises || [...DEFAULT_EXERCISES]);
  const [routineId, setRoutineId] = useState(editingRoutine?.id || null);
  
  // Global settings state
  const [settings, setSettings] = useState(editingRoutine?.settings || {
    sets: 3, restBetweenEx: 35, restBetweenSet: 60, prepTime: 10
  });

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [dragIdx, setDragIdx] = useState(null);

  // Smart Generator State
  const [showSmartGen, setShowSmartGen] = useState(false);
  const [smartPrompt, setSmartPrompt] = useState("");

  const addExercise = () => {
    setExercises([...exercises, { name: "Pushups", reps: 10, tension: 2, reset: 0.5 }]);
  };

  const removeExercise = (idx) => {
    setExercises(exercises.filter((_, i) => i !== idx));
  };

  const updateExercise = (idx, field, value) => {
    const updated = [...exercises];
    updated[idx] = { ...updated[idx], [field]: field === 'name' ? value : parseFloat(value) || 0 };
    setExercises(updated);
  };

  const updateSetting = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: parseInt(value) || 0 }));
  };

  const handleSmartGenerate = () => {
      const p = smartPrompt.toLowerCase();
      let generated = [];

      // Local heuristic smart engine
      const isCore = p.includes('core') || p.includes('abs');
      const isLegs = p.includes('leg') || p.includes('lower');
      const isUpper = p.includes('upper') || p.includes('chest') || p.includes('arm');
      const isCardio = p.includes('hiit') || p.includes('sweat') || p.includes('intense');
      const isQuick = p.includes('quick') || p.includes('5 min');

      if (isCore) {
          generated = [
              { name: "Crunches", reps: 20, tension: 1, reset: 0.5 },
              { name: "Leg Raises", reps: 15, tension: 2, reset: 0.5 },
              { name: "Plank", reps: 1, tension: 60, reset: 5 },
              { name: "Mountain Climbers", reps: 30, tension: 0.5, reset: 0.2 },
          ];
      } else if (isLegs) {
          generated = [
              { name: "Bodyweight Squats", reps: 20, tension: 2, reset: 0.5 },
              { name: "Lunges", reps: 24, tension: 2, reset: 0.5 },
              { name: "Glute Bridges", reps: 15, tension: 3, reset: 0.5 },
              { name: "Wall Sit", reps: 1, tension: 45, reset: 5 },
          ];
      } else if (isUpper) {
          generated = [
              { name: "Pushups", reps: 15, tension: 2, reset: 0.5 },
              { name: "Diamond Pushups", reps: 10, tension: 2, reset: 0.5 },
              { name: "Tricep Dips", reps: 15, tension: 2, reset: 0.5 },
              { name: "Superman", reps: 15, tension: 3, reset: 0.5 },
          ];
      } else if (isCardio) {
          generated = [
              { name: "Burpees", reps: 15, tension: 1.5, reset: 0.5 },
              { name: "Jumping Jacks", reps: 40, tension: 1, reset: 0.2 },
              { name: "Jump Squats", reps: 20, tension: 1.5, reset: 0.3 },
              { name: "Mountain Climbers", reps: 40, tension: 0.5, reset: 0.2 },
          ];
          setSettings(prev => ({ ...prev, restBetweenEx: 15, sets: 4 })); // intense settings!
      } else {
          // Full body default
          generated = [...DEFAULT_EXERCISES];
      }

      if (isQuick) {
          setSettings(prev => ({ ...prev, sets: 2, restBetweenSet: 30, restBetweenEx: 20 }));
      }

      setExercises(generated);
      setShowSmartGen(false);
      setSaveMsg('✨ Routine Auto-Generated!');
      setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleSave = async () => {
    if (!routineName.trim()) {
      setSaveMsg('Please enter a routine name! ❌');
      setTimeout(() => setSaveMsg(''), 3000);
      return;
    }
    setSaving(true);
    // Passing settings as the 5th argument
    const newId = await saveCustomWorkout(userId, routineId, routineName, exercises, settings);
    if (newId) setRoutineId(newId);
    setSaveMsg('Saved successfully! ✅');
    setSaving(false);
    setTimeout(() => {
        setSaveMsg('');
        navigate('/dashboard');
    }, 1500);
  };

  const resetToDefault = () => {
    setExercises([...DEFAULT_EXERCISES]);
  };

  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (targetIdx) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const items = [...exercises];
    const [moved] = items.splice(dragIdx, 1);
    items.splice(targetIdx, 0, moved);
    setExercises(items);
    setDragIdx(null);
  };

  return (
    <div className="page" style={{ paddingBottom: '4rem' }}>
      <div className="animated-bg" />
      <div className="orb orb-1" />

      <div className="container animate-fade-up" style={{ maxWidth: '750px', padding: '1.5rem' }}>
        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="btn btn-icon" onClick={() => navigate(-1)}>
                  <ArrowLeft size={20} />
              </button>
              <div>
                  <h2>{editingRoutine ? 'Edit Routine' : 'Workout Builder'}</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      Drag to reorder · Edit global timings
                  </p>
              </div>
          </div>
          <button className="btn btn-accent" onClick={() => setShowSmartGen(!showSmartGen)}>
              <Wand2 size={18} style={{ marginRight: '0.5rem' }} /> Smart Gen
          </button>
        </header>

        {/* Smart Generator Dropdown */}
        {showSmartGen && (
            <div className="glass-solid animate-scale-in" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--accent)' }}>
                <h4 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>🪄 Smart Generation Engine</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Describe your perfect workout, and I'll build the exercise list and configure the optimal rest times.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                        className="input" 
                        value={smartPrompt}
                        onChange={(e) => setSmartPrompt(e.target.value)}
                        placeholder="e.g. 'A quick 10 min brutal core workout'"
                        style={{ flex: 1, padding: '0.75rem' }}
                    />
                    <button className="btn btn-accent" onClick={handleSmartGenerate}>
                        Generate
                    </button>
                </div>
            </div>
        )}

        {/* Routine Name Input */}
        <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Routine Name
            </label>
            <input 
                type="text" 
                value={routineName}
                onChange={(e) => setRoutineName(e.target.value)}
                className="input"
                style={{ fontSize: '1.25rem', fontWeight: '600', padding: '1rem' }}
                placeholder="e.g. Morning Hiit"
            />
        </div>

        {/* Global Settings */}
        <div className="glass" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem', padding: '1rem' }}>
            <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sets</label>
                <input 
                    type="number" className="input" value={settings.sets} min={1}
                    onChange={(e) => updateSetting('sets', e.target.value)}
                />
            </div>
            <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rest (Ex)</label>
                <input 
                    title="Rest between exercises (sec)"
                    type="number" className="input" value={settings.restBetweenEx} min={0}
                    onChange={(e) => updateSetting('restBetweenEx', e.target.value)}
                />
            </div>
            <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rest (Set)</label>
                <input 
                    title="Rest between sets (sec)"
                    type="number" className="input" value={settings.restBetweenSet} min={0}
                    onChange={(e) => updateSetting('restBetweenSet', e.target.value)}
                />
            </div>
            <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Prep Time</label>
                <input 
                    title="Initial prep time countdown (sec)"
                    type="number" className="input" value={settings.prepTime} min={0}
                    onChange={(e) => updateSetting('prepTime', e.target.value)}
                />
            </div>
        </div>

        {/* Exercise List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {exercises.map((ex, i) => (
            <div
              key={i}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(i)}
              className="glass-solid"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                cursor: 'grab', opacity: dragIdx === i ? 0.5 : 1,
                transition: 'opacity 0.2s', padding: '1rem'
              }}
            >
              <GripVertical size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />

              <div style={{
                width: 28, height: 28, borderRadius: 'var(--radius-full)',
                background: 'var(--primary)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
              }}>
                {i + 1}
              </div>

              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  value={ex.name}
                  onChange={(e) => updateExercise(i, 'name', e.target.value)}
                  className="input"
                  style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                >
                  {PRESET_EXERCISES.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                  {!PRESET_EXERCISES.includes(ex.name) && (
                      <option key={ex.name} value={ex.name}>{ex.name}</option>
                  )}
                </select>
                <div>
                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Reps</label>
                  <input
                    type="number" value={ex.reps} min={1}
                    onChange={(e) => updateExercise(i, 'reps', e.target.value)}
                    className="input" style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Hold (s)</label>
                  <input
                    title="Time tension on eccentric phase"
                    type="number" value={ex.tension} min={0.5} step={0.5}
                    onChange={(e) => updateExercise(i, 'tension', e.target.value)}
                    className="input" style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Reset (s)</label>
                  <input
                    title="Reset time between reps"
                    type="number" value={ex.reset} min={0.2} step={0.1}
                    onChange={(e) => updateExercise(i, 'reset', e.target.value)}
                    className="input" style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <button
                onClick={() => removeExercise(i)}
                style={{
                  background: 'none', border: 'none', color: 'var(--danger)',
                  cursor: 'pointer', padding: '0.25rem', flexShrink: 0,
                }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        {/* Add + Reset Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button className="btn btn-ghost" onClick={addExercise} style={{ flex: 1 }}>
            <Plus size={18} /> Add Exercise
          </button>
          {exercises.length === 0 && (
              <button className="btn btn-ghost" onClick={resetToDefault}>
                <RotateCcw size={18} /> Default
              </button>
          )}
        </div>

        {/* Save Button */}
        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
          onClick={handleSave}
          disabled={saving || exercises.length === 0}
        >
          <Save size={20} />
          {saving ? 'Saving...' : 'Save Routine'}
        </button>

        {saveMsg && (
          <p className="animate-fade-in" style={{
            textAlign: 'center', color: saveMsg.includes('❌') ? 'var(--danger)' : 'var(--accent)', marginTop: '0.75rem',
          }}>
            {saveMsg}
          </p>
        )}
      </div>
    </div>
  );
}
