import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

function Home() {
  const [date, setDate] = useState(new Date());

  return (
    <main className="main-content">
      <div className="welcome-section">
        <div className="welcome-text">
          <h2>환영합니다</h2>
          <p>
            이곳은 조세핀이 영어 강의스케쥴 입니다. 캘린더에서 일자와 시간을
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
  );
}

export default Home;
