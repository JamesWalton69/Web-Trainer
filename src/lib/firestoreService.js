// firestoreService.js — All Firestore CRUD operations

import { db } from './firebase';
import {
  collection, addDoc, getDocs, query, orderBy, limit, doc, setDoc, Timestamp, deleteDoc
} from 'firebase/firestore';

// ===== WORKOUT SESSION LOGGING =====

export async function logWorkoutSession(userId, summary) {
  if (!userId) return;
  try {
    const sessionsRef = collection(db, 'users', userId, 'sessions');
    await addDoc(sessionsRef, {
      ...summary,
      timestamp: Timestamp.now(),
      date: new Date().toISOString().split('T')[0], // "2026-04-17"
    });
  } catch (e) {
    console.error('Error logging session:', e);
  }
}

// ===== GET WORKOUT HISTORY =====

export async function getWorkoutHistory(userId) {
  if (!userId) return [];
  try {
    const sessionsRef = collection(db, 'users', userId, 'sessions');
    const q = query(sessionsRef, orderBy('timestamp', 'desc'), limit(100));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error('Error fetching history:', e);
    return [];
  }
}

// ===== COMPUTE USER STATS =====

export function computeStats(sessions) {
  const totalSessions = sessions.filter(s => s.status === 'Completed').length;
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.active_minutes || 0), 0);
  const totalPauses = sessions.reduce((sum, s) => sum + (s.pauses || 0), 0);

  // Calculate streak
  const completedDates = [...new Set(
    sessions
      .filter(s => s.status === 'Completed')
      .map(s => s.date)
  )].sort().reverse();

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < completedDates.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().split('T')[0];
    if (completedDates.includes(expectedStr)) {
      streak++;
    } else {
      break;
    }
  }

  // Calculate level (1 level per 5 completed sessions)
  const level = Math.max(1, Math.floor(totalSessions / 5) + 1);

  // Weekly minutes
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weeklyMinutes = sessions
    .filter(s => s.date && new Date(s.date) >= oneWeekAgo)
    .reduce((sum, s) => sum + (s.active_minutes || 0), 0);

  return {
    totalSessions,
    totalMinutes: Math.round(totalMinutes * 100) / 100,
    totalPauses,
    streak,
    level,
    weeklyMinutes: Math.round(weeklyMinutes * 100) / 100,
    completedDates,
  };
}

// ===== BADGES =====

export function computeBadges(stats, sessions) {
  const badges = [
    {
      id: 'first_workout',
      name: 'First Step',
      emoji: '🏅',
      description: 'Complete your first workout',
      unlocked: stats.totalSessions >= 1,
    },
    {
      id: 'streak_3',
      name: 'On Fire',
      emoji: '🔥',
      description: '3-day workout streak',
      unlocked: stats.streak >= 3,
    },
    {
      id: 'streak_7',
      name: 'Unstoppable',
      emoji: '⚡',
      description: '7-day workout streak',
      unlocked: stats.streak >= 7,
    },
    {
      id: 'streak_30',
      name: 'Iron Will',
      emoji: '🏆',
      description: '30-day workout streak',
      unlocked: stats.streak >= 30,
    },
    {
      id: 'sessions_10',
      name: 'Dedicated',
      emoji: '💪',
      description: 'Complete 10 workouts',
      unlocked: stats.totalSessions >= 10,
    },
    {
      id: 'sessions_50',
      name: 'Veteran',
      emoji: '🎖️',
      description: 'Complete 50 workouts',
      unlocked: stats.totalSessions >= 50,
    },
    {
      id: 'minutes_60',
      name: 'Hour Power',
      emoji: '⏱️',
      description: 'Accumulate 60 active minutes',
      unlocked: stats.totalMinutes >= 60,
    },
    {
      id: 'minutes_500',
      name: 'Marathon Mind',
      emoji: '🏃',
      description: 'Accumulate 500 active minutes',
      unlocked: stats.totalMinutes >= 500,
    },
    {
      id: 'no_pause',
      name: 'Zero Excuses',
      emoji: '🚫',
      description: 'Complete a workout with 0 pauses',
      unlocked: sessions.some(s => s.status === 'Completed' && s.pauses === 0),
    },
    {
      id: 'level_5',
      name: 'Level Up',
      emoji: '🌟',
      description: 'Reach Level 5',
      unlocked: stats.level >= 5,
    },
  ];
  return badges;
}

// ===== CHART DATA =====

export function buildChartData(sessions) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const last7 = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = days[d.getDay()];
    const dayMinutes = sessions
      .filter(s => s.date === dateStr)
      .reduce((sum, s) => sum + (s.active_minutes || 0), 0);
    last7.push({ day: dayName, date: dateStr, minutes: Math.round(dayMinutes * 10) / 10 });
  }

  return last7;
}

// ===== STREAK CALENDAR (last 28 days) =====

export function buildStreakCalendar(completedDates) {
  const cells = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const completed = completedDates.includes(dateStr);
    cells.push({ date: dateStr, completed });
  }
  return cells;
}

// ===== CUSTOM ROUTINES =====

export async function saveCustomWorkout(userId, routineId, routineName, workout, settings) {
  if (!userId) return null;
  try {
    const id = routineId || routineName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString().slice(-4);
    const ref = doc(db, 'users', userId, 'routines', id);
    await setDoc(ref, { 
      id,
      name: routineName || 'My Routine',
      exercises: workout, 
      settings: settings || { sets: 3, restBetweenSet: 60, restBetweenEx: 35, prepTime: 10 },
      updatedAt: Timestamp.now() 
    });
    return id;
  } catch (e) {
    console.error('Error saving custom workout:', e);
    return null;
  }
}

export async function getCustomWorkouts(userId) {
  if (!userId) return [];
  try {
    const routinesRef = collection(db, 'users', userId, 'routines');
    const q = query(routinesRef, orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error('Error loading custom workouts:', e);
    return [];
  }
}

export async function deleteCustomWorkout(userId, routineId) {
  if (!userId || !routineId) return;
  try {
    const ref = doc(db, 'users', userId, 'routines', routineId);
    await deleteDoc(ref);
  } catch (e) {
    console.error('Error deleting custom workout:', e);
  }
}

// ===== ADAPTIVE PROGRESSION =====

export async function saveFeedback(userId, sessionId, feedback) {
  if (!userId) return;
  try {
    const ref = doc(db, 'users', userId, 'feedback', sessionId);
    await setDoc(ref, { feedback, timestamp: Timestamp.now() });
  } catch (e) {
    console.error('Error saving feedback:', e);
  }
}
