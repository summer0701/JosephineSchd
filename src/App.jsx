import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./App.css";

function App() {
  const [date, setDate] = useState(new Date());

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="title">조세핀의 다락방</h1>
        <p className="subtitle">세상으로부터 조용히 떨어진 영어 강의 시간</p>
      </header>

      <main className="main-content">
        <div className="welcome-section">
          <div className="welcome-text">
            <h2>환영합니다</h2>
            <p>
              이곳은 조세핀이 영어 강의스케쥴 입니다. 캘린더애서 일자와 시간을
              확인해주세요.
            </p>
          </div>
        </div>

        <div className="calendar-section">
          <h2 className="calendar-title">📅 달력</h2>
          <div className="calendar-wrapper">
            <Calendar
              value={date}
              onChange={setDate}
              locale="ko-KR"
              calendarType="iso8601"
            />
          </div>
          <div className="selected-date">
            <p>
              선택된 날짜: <strong>{date.toLocaleDateString("ko-KR")}</strong>
            </p>
          </div>
        </div>

        <footer className="footer">
          <p>✨ 매 순간을 소중히 ✨</p>
        </footer>
      </main>
    </div>
  );
}

export default App;
