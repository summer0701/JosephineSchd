import React from "react";
import { Link, useLocation } from "react-router-dom";
import "../styles/Navigation.css";

function Navigation() {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path ? "active" : "";
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/home" className="nav-logo">
          🌸 조세핀의 다락방
        </Link>

        <ul className="nav-menu">
          <li className="nav-item">
            <Link to="/home" className={`nav-link ${isActive("/home")}`}>
              🏠 홈
            </Link>
          </li>
          <li className="nav-item">
            <Link
              to="/demo-lecture"
              className={`nav-link ${isActive("/demo-lecture")}`}
            >
              🎤 데모강의신청
            </Link>
          </li>
          <li className="nav-item">
            <Link
              to="/materials"
              className={`nav-link ${isActive("/materials")}`}
            >
              📚 자료실
            </Link>
          </li>
          <li className="nav-item">
            <Link
              to="/flashcards"
              className={`nav-link ${isActive("/flashcards")}`}
            >
              플래시카드
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navigation;
