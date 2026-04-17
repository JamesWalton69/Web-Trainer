import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import WorkoutEngine from './pages/WorkoutEngine';
import WorkoutBuilder from './pages/WorkoutBuilder';
import PostWorkout from './pages/PostWorkout';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/workout" element={<WorkoutEngine />} />
          <Route path="/build" element={<WorkoutBuilder />} />
          <Route path="/post-workout" element={<PostWorkout />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
