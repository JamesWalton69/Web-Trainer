import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Pause, Play, Square, Volume2, VolumeX, Camera, CameraOff, Mic, MicOff, Music } from 'lucide-react';
import { getRandomQuote } from '../lib/quotes';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

const defaultWorkout = [
  {"name": "Incline Pushups", "reps": 10, "tension": 2, "reset": 0.4, "gif": "/exercises/incline-pushups.png"},
  {"name": "Jump Squats", "reps": 17, "tension": 2, "reset": 0.4, "gif": "/exercises/jump-squats.png"},
  {"name": "Glute Bridges", "reps": 15, "tension": 3, "reset": 0.4, "gif": "/exercises/glute-bridges.png"},
  {"name": "Superman", "reps": 11, "tension": 3.5, "reset": 0.6, "gif": "/exercises/superman.png"},
  {"name": "Plank", "reps": 1, "tension": 45, "reset": 10, "gif": "/exercises/plank.png"}
];

const PHASE_COLORS = {
  'GET READY': '#334155',
  'NEXT': '#4F46E5',
  'SET': '#6C63FF',
  'DOWN': '#059669',
  'UP': '#DC2626',
  'REST': '#1E293B',
  'TRANSITION': '#1E293B',
  'COMPLETE': '#D97706',
  'PAUSED': '#D97706',
};

function getPhaseColor(phase) {
  if (phase.includes('DOWN')) return PHASE_COLORS.DOWN;
  if (phase.includes('UP') && !phase.includes('PUSHUP')) return PHASE_COLORS.UP;
  if (phase.includes('NEXT')) return PHASE_COLORS.NEXT;
  if (phase.includes('SET')) return PHASE_COLORS.SET;
  return PHASE_COLORS[phase] || '#1E293B';
}

export default function WorkoutEngine() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const activeWorkout = location.state?.routine || defaultWorkout;
  const workoutName = location.state?.routineName || "Standard Workout";
  
  // Apply Global Settings
  const TIMING = location.state?.routineSettings || {
    sets: 3, restBetweenEx: 35, restBetweenSet: 60, prepTime: 10
  };

  const [phase, setPhase] = useState("GET READY");
  const [subInfo, setSubInfo] = useState("");
  const [currentEx, setCurrentEx] = useState(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [restQuote, setRestQuote] = useState(null);

  // Camera & AI State
  const [cameraActive, setCameraActive] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [showSpotify, setShowSpotify] = useState(false);
  const recognitionRef = useRef(null);
  const voiceActiveRef = useRef(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectorRef = useRef(null);
  const animationFrameId = useRef(null);

  const [overallProgress, setOverallProgress] = useState(0);
  const [aiRepCount, setAiRepCount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [countdownMax, setCountdownMax] = useState(0);

  const pausedRef = useRef(false);
  const stoppedRef = useRef(false);
  const mutedRef = useRef(false);
  const audioCtxRef = useRef(null);
  const pauseCountRef = useRef(0);
  const totalPauseDurRef = useRef(0);
  const pauseStartRef = useRef(0);
  const currentExRef = useRef(null);

  const repStateRef = useRef("UP");
  const lastCorrectionTimeRef = useRef(0);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { voiceActiveRef.current = voiceActive; }, [voiceActive]);

  const speak = useCallback((text) => {
    if (mutedRef.current || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 1.0;
    window.speechSynthesis.speak(msg);
  }, []);

  const beep = useCallback((frequency) => {
    if (mutedRef.current) return;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }, []);

  const calculateAngle = (A, B, C) => {
    if (!A || !B || !C || A.score < 0.3 || B.score < 0.3 || C.score < 0.3) return null;
    const radians = Math.atan2(C.y - B.y, C.x - B.x) - Math.atan2(A.y - B.y, A.x - B.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
  };

  const analyzeForm = (poses) => {
    if (poses.length === 0 || !currentExRef.current) return;
    const keypoints = poses[0].keypoints;
    const getKp = name => keypoints.find(k => k.name === name);
    const exercise = currentExRef.current.toLowerCase();
    
    // Squats
    if (exercise.includes("squat")) {
      const hip = getKp('left_hip') || getKp('right_hip');
      const knee = getKp('left_knee') || getKp('right_knee');
      const ankle = getKp('left_ankle') || getKp('right_ankle');
      const angle = calculateAngle(hip, knee, ankle);
      if (angle !== null) {
        if (angle > 165) {
            if (repStateRef.current === "DOWN") setAiRepCount(p => p + 1);
            repStateRef.current = "UP";
        }
        if (angle < 90) {
            repStateRef.current = "DOWN";
        } else if (angle > 90 && angle < 140 && repStateRef.current === "UP") {
            if (Date.now() - lastCorrectionTimeRef.current > 3000) {
                speak("Squat deeper!");
                lastCorrectionTimeRef.current = Date.now();
            }
        }
      }
    }
    // Pushups
    if (exercise.includes("pushup")) {
      const shoulder = getKp('left_shoulder') || getKp('right_shoulder');
      const elbow = getKp('left_elbow') || getKp('right_elbow');
      const wrist = getKp('left_wrist') || getKp('right_wrist');
      const angle = calculateAngle(shoulder, elbow, wrist);
      if (angle !== null) {
        if (angle > 150) {
            if (repStateRef.current === "DOWN") setAiRepCount(p => p + 1);
            repStateRef.current = "UP";
        }
        if (angle < 80) {
            repStateRef.current = "DOWN";
        } else if (angle > 80 && angle < 130 && repStateRef.current === "UP") {
            if (Date.now() - lastCorrectionTimeRef.current > 3000) {
                speak("Lower your chest!");
                lastCorrectionTimeRef.current = Date.now();
            }
        }
      }
    }
  };

  // --- AI Camera Functions ---
  const requestCameraPermission = async () => {
    const confirmation = window.confirm("Enable the AI Posture Tracker using your camera? Your video stream is analyzed securely on your device and never sent to the cloud.");
    if (!confirmation) return;

    setAiLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = async () => {
        videoRef.current.play();
        setCameraActive(true);

        // Initialize TensorFlow and PoseDetection MoveNet
        await tf.ready();
        detectorRef.current = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
        });
        
        setAiLoading(false);
        detectPose(); // Start the loop
      };
    } catch (err) {
      console.error(err);
      alert("Microphone/Camera permission denied or failed to load hardware.");
      setAiLoading(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
       videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
  };

  // The AI frame analysis loop
  const detectPose = async () => {
      if (!detectorRef.current || !videoRef.current || !canvasRef.current) return;
      
      const poses = await detectorRef.current.estimatePoses(videoRef.current);
      drawPoseOnCanvas(poses);
      analyzeForm(poses);

      animationFrameId.current = requestAnimationFrame(detectPose);
  };

  const toggleVoiceControl = () => {
      if (voiceActive) {
          if (recognitionRef.current) recognitionRef.current.stop();
          setVoiceActive(false);
          return;
      }
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
          alert("Speech recognition isn't supported in your browser.");
          return;
      }
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event) => {
          const results = event.results;
          const latest = results[results.length - 1];
          if (latest.isFinal) {
              const command = latest[0].transcript.trim().toLowerCase();
              if (command.includes('pause')) setPaused(true);
              else if (command.includes('play') || command.includes('resume')) setPaused(false);
              else if (command.includes('stop')) stoppedRef.current = true;
          }
      };
      
      recognition.onend = () => {
          if (recognitionRef.current && voiceActiveRef.current) {
              try { recognitionRef.current.start(); } catch(e){}
          }
      };
      
      recognition.start();
      recognitionRef.current = recognition;
      setVoiceActive(true);
  };

  const drawPoseOnCanvas = (poses) => {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      if (poses.length > 0) {
          const pose = poses[0];
          pose.keypoints.forEach(kpt => {
              if (kpt.score > 0.3) {
                  ctx.beginPath();
                  ctx.arc(kpt.x, kpt.y, 5, 0, 2 * Math.PI);
                  ctx.fillStyle = "var(--neon-pink)";
                  ctx.fill();
              }
          });
      }
  };

  const interruptibleSleep = useCallback(async (seconds) => {
    let elapsed = 0;
    const slice = 0.1;
    setCountdown(Math.ceil(seconds));
    setCountdownMax(Math.ceil(seconds));
    while (elapsed < seconds) {
      if (stoppedRef.current) throw new Error("Stopped");
      if (pausedRef.current) {
        await new Promise(r => setTimeout(r, 100));
        continue;
      }
      await new Promise(r => setTimeout(r, slice * 1000));
      elapsed += slice;
      setCountdown(Math.max(0, Math.ceil(seconds - elapsed)));
    }
    setCountdown(0);
  }, []);

  const totalWork = activeWorkout.reduce((sum, ex) => sum + (ex.reps * TIMING.sets), 0);

  const runWorkout = useCallback(async () => {
    const start = Date.now();
    let completedReps = 0;

    try {
      if (TIMING.prepTime > 0) {
        setPhase("GET READY");
        setSubInfo(workoutName);
        speak("Workout starting. Get ready.");
        await interruptibleSleep(TIMING.prepTime);
      }

      for (let i = 0; i < activeWorkout.length; i++) {
        const ex = activeWorkout[i];
        setCurrentEx(ex);
        currentExRef.current = ex.name;
        setRestQuote(null);

        setPhase(`NEXT: ${ex.name}`);
        setSubInfo(`Exercise ${i + 1} of ${activeWorkout.length}`);
        speak(`Next is ${ex.name}`);
        await interruptibleSleep(3);

        for (let s = 1; s <= TIMING.sets; s++) {
          setPhase(`${ex.name}`);
          setSubInfo(`Set ${s} of ${TIMING.sets}`);
          speak(`Set ${s}`);
          await interruptibleSleep(1.5);

          for (let r = 1; r <= ex.reps; r++) {
            if (stoppedRef.current) throw new Error("Stopped");

            setPhase(`REP ${r} — DOWN`);
            setSubInfo(`${ex.name} · Set ${s}/${TIMING.sets}`);
            beep(1500);
            await interruptibleSleep(ex.tension);

            setPhase("UP");
            setSubInfo(`${ex.name} · Set ${s}/${TIMING.sets}`);
            beep(500);
            await interruptibleSleep(Math.max(ex.reset, 0.2));

            completedReps++;
            setOverallProgress(Math.round((completedReps / totalWork) * 100));
          }

          if (s < TIMING.sets && TIMING.restBetweenSet > 0) {
            setPhase("REST");
            setSubInfo(`Next: Set ${s + 1}`);
            setRestQuote(getRandomQuote());
            speak("Resting");
            await interruptibleSleep(TIMING.restBetweenSet);
            setRestQuote(null);
          }
        }

        if (i < activeWorkout.length - 1 && TIMING.restBetweenEx > 0) {
          setPhase("TRANSITION");
          setSubInfo(`Up next: ${activeWorkout[i + 1].name}`);
          setRestQuote(getRandomQuote());
          await interruptibleSleep(TIMING.restBetweenEx);
          setRestQuote(null);
        }
      }

      setOverallProgress(100);
      setPhase("COMPLETE");
      setSubInfo("Amazing work! 🎉");
      speak("Session Complete! Great job!");

      const elapsed = (Date.now() - start) / 1000 / 60;
      const activeMinutes = elapsed - (totalPauseDurRef.current / 60);

      setTimeout(() => {
        navigate('/post-workout', { state: {
          status: 'Completed',
          active_minutes: Math.round(activeMinutes * 100) / 100,
          pauses: pauseCountRef.current,
          last_exercise: activeWorkout[activeWorkout.length - 1].name,
        }});
      }, 3000);

    } catch (e) {
      if (e.message !== "Stopped") console.error(e);
      else {
        const elapsed = (Date.now() - start) / 1000 / 60;
        const activeMinutes = elapsed - (totalPauseDurRef.current / 60);
        navigate('/post-workout', { state: {
          status: 'Incomplete',
          active_minutes: Math.round(activeMinutes * 100) / 100,
          pauses: pauseCountRef.current,
          last_exercise: currentExRef.current || 'None',
        }});
      }
    }
  }, [speak, beep, interruptibleSleep, navigate, totalWork, TIMING, activeWorkout, workoutName]);

  useEffect(() => {
    stoppedRef.current = false;
    pauseCountRef.current = 0;
    totalPauseDurRef.current = 0;
    setTimeout(() => {
        if (!stoppedRef.current) runWorkout();
    }, 0);
    return () => { 
        stoppedRef.current = true; 
        stopCamera();
    };
  }, [runWorkout]);

  const togglePause = useCallback(() => {
    setPaused(prev => {
      const next = !prev;
      if (next) {
        pauseCountRef.current++;
        pauseStartRef.current = Date.now();
      } else {
        if (pauseStartRef.current) {
          totalPauseDurRef.current += (Date.now() - pauseStartRef.current) / 1000;
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'Space') { e.preventDefault(); togglePause(); }
      if (e.code === 'Escape') { stoppedRef.current = true; }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePause]);

  const ringRadius = 56;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringProgress = countdownMax > 0 ? countdown / countdownMax : 0;
  const ringDashOffset = ringCircumference * (1 - ringProgress);

  const bgColor = paused ? PHASE_COLORS.PAUSED : getPhaseColor(phase);

  return (
    <div className="workout-bg" style={{
      height: '100vh', width: '100vw',
      background: `linear-gradient(135deg, ${bgColor}dd, ${bgColor}88)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', position: 'relative', overflow: 'hidden',
    }}>
      {/* Top Controls */}
      <div style={{
        position: 'absolute', top: '1rem', left: '1rem', right: '1rem',
        display: 'flex', justifyContent: 'space-between', zIndex: 10,
      }}>
        <button className="btn btn-icon" onClick={() => { stoppedRef.current = true; }}>
          <Square size={20} />
        </button>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className={`btn btn-icon ${cameraActive ? 'btn-accent' : ''}`} onClick={cameraActive ? stopCamera : requestCameraPermission} title="AI Posture Tracking">
                {aiLoading ? "..." : (cameraActive ? <Camera size={20} /> : <CameraOff size={20} />)}
            </button>
            <button className={`btn btn-icon ${voiceActive ? 'btn-accent' : ''}`} onClick={toggleVoiceControl} title="Voice Commands (Pause/Play/Stop)">
                {voiceActive ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            <button className="btn btn-icon" onClick={() => setMuted(!muted)}>
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
        </div>
      </div>

      {/* AI Posture Camera Feed */}
      <div style={{
          position: 'absolute', top: '4rem', right: '1rem', zIndex: 20,
          display: cameraActive ? 'block' : 'none',
          borderRadius: '12px', overflow: 'hidden', border: '2px solid var(--accent)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)', width: '200px', height: '150px'
      }}>
          <video ref={videoRef} playsInline style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
          <canvas ref={canvasRef} width="640" height="480" style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
          {cameraActive && (
              <div style={{ position: 'absolute', bottom: '5px', left: '5px', background: 'var(--accent)', color: 'var(--bg-deep)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 700 }}>
                  AI ACTIVE | REPS: {aiRepCount}
              </div>
          )}
      </div>

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'rgba(0,0,0,0.3)', }}>
        <div style={{
          height: '100%', width: `${overallProgress}%`,
          background: 'linear-gradient(90deg, var(--primary), var(--accent))',
          transition: 'width 0.5s ease', boxShadow: '0 0 10px var(--primary-glow)',
        }} />
      </div>

      {currentEx && currentEx.gif && !['REST', 'TRANSITION', 'COMPLETE'].includes(phase) && (
        <div className="animate-scale-in" style={{ marginBottom: '1.5rem' }}>
          <img src={currentEx.gif} alt={currentEx.name} className="exercise-img" style={{ height: '200px', objectFit: 'cover' }} />
        </div>
      )}

      {(phase === 'REST' || phase === 'TRANSITION' || phase === 'GET READY') && countdown > 0 && (
        <div className="countdown-container" style={{ marginBottom: '1.5rem' }}>
          <svg width="140" height="140" className="progress-ring">
            <circle className="progress-ring__circle-bg" cx="70" cy="70" r={ringRadius} strokeWidth="6" />
            <circle className="progress-ring__circle" cx="70" cy="70" r={ringRadius} strokeWidth="6" stroke="var(--accent)" strokeDasharray={ringCircumference} strokeDashoffset={ringDashOffset} />
          </svg>
          <span className="countdown-text" style={{ fontSize: '2.5rem' }}>{countdown}</span>
        </div>
      )}

      {restQuote && (phase === 'REST' || phase === 'TRANSITION') && (
        <div style={{ maxWidth: '500px', textAlign: 'center', marginBottom: '1rem', padding: '0 1.5rem', }}>
          <p style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>"{restQuote.text}"</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '0.25rem' }}>— {restQuote.author}</p>
        </div>
      )}

      <h1 className="workout-phase" style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)', textAlign: 'center', textShadow: '2px 4px 12px rgba(0,0,0,0.5)', lineHeight: 1.1, }}>
        {paused ? "PAUSED" : phase}
      </h1>

      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', marginTop: '0.5rem', fontWeight: 500, }}>
        {paused ? 'Press SPACE to resume' : subInfo}
      </p>

      <button onClick={togglePause} className="btn-icon animate-pulse" style={{ marginTop: '2rem', width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,0,0,0.3)', color: 'white', border: '2px solid rgba(255,255,255,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', }}>
        {paused ? <Play size={28} /> : <Pause size={28} />}
      </button>

      <div style={{ position: 'absolute', bottom: '1rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', textAlign: 'center', }}>
        SPACE = Pause · ESC = Stop · {overallProgress}% Complete
      </div>

      {/* Spotify Widget */}
      <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
         {showSpotify && (
             <div className="animate-scale-in" style={{ background: 'rgba(0,0,0,0.8)', padding: '0.5rem', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                 <iframe style={{ borderRadius: '12px' }} src="https://open.spotify.com/embed/playlist/37i9dQZF1DX76Wlfdnj7AP?utm_source=generator" width="280" height="152" frameBorder="0" allowFullScreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
             </div>
         )}
         <button className="btn btn-icon" style={{ background: 'var(--accent)', color: 'var(--bg-deep)', opacity: 0.9 }} onClick={() => setShowSpotify(!showSpotify)}>
             <Music size={20} />
         </button>
      </div>

    </div>
  );
}
