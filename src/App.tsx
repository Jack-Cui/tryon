import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './pages/Login';
import Home from './pages/Home';
import ProtectedRoute from './components/ProtectedRoute';
import TestLinks from './components/TestLinks';
import TryonTest from './components/TryonTest';
import SimpleTryonTest from './components/SimpleTryonTest';
import TestNavigation from './components/TestNavigation';
import RTCVideoTest from './pages/RTCVideoTest';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/test-nav" element={<TestNavigation />} />
          <Route path="/tryon-test" element={<TryonTest />} />
          <Route path="/simple-tryon-test" element={<SimpleTryonTest />} />
          <Route path="/rtc-video-test" element={<RTCVideoTest />} />
          <Route 
            path="/home" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />
        </Routes>
        {/* 开发环境显示测试链接 */}
        {process.env.NODE_ENV === 'development' && <TestLinks />}
      </div>
    </Router>
  );
}

export default App;
