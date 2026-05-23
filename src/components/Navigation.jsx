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
        <div className="nav-brand">
          <Link to="/home" className="nav-logo">
            🌸 조세핀의 다락방
          </Link>
          <a
            className="nav-contact-link"
            href="https://open.kakao.com/o/grBdxkwi"
            target="_blank"
            rel="noopener noreferrer"
          >
            오픈 채팅으로 문의하기
          </a>
        </div>

        <ul className="nav-menu">
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
              to="/growth-stats"
              className={`nav-link ${isActive("/growth-stats")}`}
            >
              📈 나의 성장 통계
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
