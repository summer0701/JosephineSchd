import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
import Home from "./pages/Home";
import DemoLecture from "./pages/DemoLecture";
import Materials from "./pages/Materials";
import Admin from "./pages/Admin";
import "./App.css";

function App() {
  return (
    <Router basename="/JosephineSchd">
      <div className="app-container">
        <header className="header">
          <h1 className="title">조세핀의 다락방</h1>
          <p className="subtitle">세상으로부터 조용히 떨어진 영어 강의 시간</p>
        </header>

        <Navigation />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/demo-lecture" element={<DemoLecture />} />
          <Route path="/flashcards" element={<Materials />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
