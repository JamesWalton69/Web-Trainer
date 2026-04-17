# FitTrainer 🚀 — Web AI Workout Companion

**FitTrainer** is an advanced, offline-capable Progressive Web Application (PWA) designed to act as your personalized fitness coach directly from your browser. 

Through the use of client-side computer vision (TensorFlow.js), generative AI (Gemini), and Web Speech APIs, FitTrainer tracks your reps, speaks advice, and creates dynamic custom routines for you automatically.

---

## 🔥 Features Added

1. **AI Posture Tracking & Auto Rep Counting** 📷
   Using `@tensorflow-models/pose-detection` (MoveNet), the app tracks your key movement angles (e.g., knee hinge during squats, elbow depth during pushups). It only counts a repetition when it recognizes that you hit the correct biological angle!
2. **Talkback Form Correction** 🗣️
   Built with the browser's `SpeechSynthesis` framework. If you don't drop low enough during a squat, or if you break form, the AI will audibly coach you (e.g., *"Squat deeper!"* or *"Lower your chest!"*).
3. **Voice Commands** 🎙️
   Using the `SpeechRecognition` API, you never have to touch your mouse while sweating. Simply shout **"Pause"**, **"Play"**, or **"Stop"** across the room.
4. **AI Smart Coach (Gemini GenAI)** 🧠
   Located right on your Dashboard! Paste your free Gemini API key into the app, then type a natural prompt like *"Give me a high-intensity shoulder burner for 10 minutes."* The LLM creates structured workout logic which immediately dumps into your Firebase account as a playable custom routine.
5. **Spotify Music Embeds** 🎶
   Launch your favorite workout playlist via an integrated Spotify floating mini-player accessible directly within the core Workout Engine.
6. **Robust PWA Capabilities** 📱
   Includes the comprehensive `vite-plugin-pwa`. Built with offline caching logic exceeding 5MB capabilities so all UI/UX components run fluidly regardless of internet connection.

---

## 💻 Tech Stack Setup

- **Framework**: React 19 + Vite + ESModules
- **Database / Auth**: Firebase (Firestore)
- **Computer Vision Model**: TensorFlow.js (MoveNet Architecture)
- **Generative AI Model**: Google Gemini API v1Beta
- **Charts / UI Vectors**: Recharts, Lucide-React
- **PWA Service Worker**: VitePWA Wrapper

---

## 🛠️ Instructions for Running

### General Server Start

Your application has already been moved to its designated directory. To begin working with or testing the app:

1. Open your terminal (PowerShell, Command Prompt, or Git Bash).
2. Change directory into the project root:
   ```bash
   cd E:\WEBTRAINER
   ```
3. Initialize the application using Vite's development server:
   ```bash
   npm run dev
   ```
4. Access the web interface by visiting `http://localhost:5173/` in Google Chrome or Microsoft Edge.

### Deploying & Production Build
To test the Progressive Web App (PWA) caching thresholds or export a fully minified client bundle:
```bash
npm run build
npm run preview
```

---

## 🔑 Activating the AI Smart Coach

To utilize the generative routines (Feature #4):

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Generate a free API key.
3. Open the **Dashboard** within your running FitTrainer web application.
4. Click the **"✨ AI Coach"** button located on the right side of "*Your Routines*".
5. Paste your Gemini API Key into the form input. Don't worry—this key never hits a third-party server and is safely secured inside your local browser storage!
6. Type in your dream workout request and click generate!
