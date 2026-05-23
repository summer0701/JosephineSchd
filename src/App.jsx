import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navigation from "./components/Navigation";
import Home from "./pages/Home";
import DemoLecture from "./pages/DemoLecture";
import Materials from "./pages/Materials";
import Admin from "./pages/Admin";
import ScheduleDetail from "./pages/ScheduleDetail";
import Login from "./pages/Login";
import Flashcards from "./pages/Flashcards";
import "./App.css";

const LOGIN_USER_KEY = "josephineLoginUser";

function ProtectedLayout() {
  const isLoggedIn = Boolean(localStorage.getItem(LOGIN_USER_KEY));
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  if (location.pathname === "/home") {
    return <Home />;
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="title">조세핀의 다락방</h1>
        <p className="subtitle">세상으로부터 조용히 떨어진 영어 강의 시간</p>
      </header>

      <Navigation />

      <Routes>
        <Route path="home" element={<Home />} />
        <Route path="demo-lecture" element={<DemoLecture />} />
        <Route path="materials" element={<Materials />} />
        <Route path="flashcards" element={<Flashcards />} />
        <Route path="schedule/:scheduleIndex" element={<ScheduleDetail />} />
        <Route path="admin" element={<Admin />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router basename="/JosephineSchd">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/*" element={<ProtectedLayout />} />
      </Routes>
    </Router>
  );
}

export default App;
