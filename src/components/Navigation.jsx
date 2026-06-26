import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "../styles/Navigation.css";

const XP_SHEET_ID = "1B3EHtBTg-uyolVGvJz0y5sP2Jj2NjGzR0nj17vLRsfY";
const LOGIN_USER_KEY = "josephineLoginUser";
const LOGIN_CLASS_KEY = "josephineLoginClass";

const XP_COLUMNS = {
  className: ["class", "class_name", "클래스명"],
  studentName: ["student_name", "student", "name", "이름"],
  xp: ["coin", "Coin", "코인", "xp", "XP"],
};

const parseCsv = (csvText) => {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      value += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }

      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  row.push(value);
  if (row.some((cell) => cell.trim() !== "")) {
    rows.push(row);
  }

  return rows;
};

const getColumnIndex = (headers, candidates, fallbackIndex) => {
  const normalizedHeaders = headers.map((header) => header.trim().toLowerCase());
  const normalizedCandidates = candidates.map((candidate) => candidate.toLowerCase());
  const foundIndex = normalizedHeaders.findIndex((header) =>
    normalizedCandidates.includes(header)
  );

  return foundIndex >= 0 ? foundIndex : fallbackIndex;
};

const fetchStudentCoin = async (studentName, className) => {
  const url = `https://docs.google.com/spreadsheets/d/${XP_SHEET_ID}/gviz/tq?tqx=out:csv`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("코인 정보를 불러오지 못했습니다.");
  }

  const rows = parseCsv(await response.text());
  if (rows.length < 2) {
    return 0;
  }

  const headers = rows[0];
  const classIndex = getColumnIndex(headers, XP_COLUMNS.className, 0);
  const nameIndex = getColumnIndex(headers, XP_COLUMNS.studentName, 1);
  const xpIndex = getColumnIndex(headers, XP_COLUMNS.xp, 3);
  const matchedRow = rows.find(
    (row, index) =>
      index > 0 &&
      (row[nameIndex] || "").trim() === studentName &&
      (!className || (row[classIndex] || "").trim() === className)
  );

  return Number(matchedRow?.[xpIndex] || 0);
};

function Navigation() {
  const location = useLocation();
  const [coin, setCoin] = useState(null);

  const isActive = (path) => {
    return location.pathname === path ? "active" : "";
  };

  useEffect(() => {
    const studentName = localStorage.getItem(LOGIN_USER_KEY);
    const className = localStorage.getItem(LOGIN_CLASS_KEY);

    if (!studentName) {
      setCoin(null);
      return;
    }

    let isMounted = true;

    fetchStudentCoin(studentName, className)
      .then((nextCoin) => {
        if (isMounted) {
          setCoin(nextCoin);
        }
      })
      .catch((error) => {
        console.error("코인 정보 로딩 오류:", error);
        if (isMounted) {
          setCoin(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <Link to="/flashcards" className="nav-logo">
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
          <span className="nav-coin" aria-label={`보유 코인 ${coin ?? 0}`}>
            <span aria-hidden="true">●</span>
            {coin ?? "-"} 코인
          </span>
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
