import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

function Home() {
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDateEvents, setSelectedDateEvents] = useState([]);

  // Google Sheets에서 데이터 가져오기
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const sheetId = "1b5Lw2NH1KgZz16DnEeDfDk4QUFjXjRFgG2g_g-s41Mk";
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq`;

        const response = await fetch(url);
        const text = await response.text();

        // Google Visualization API 응답 파싱
        const jsonStr = text.match(/\(({.*})\)/)[1];
        const data = JSON.parse(jsonStr);

        if (data.table && data.table.rows) {
          const processedEvents = [];
          let eventId = 0;

          data.table.rows.forEach((row) => {
            const title = row.c[0]?.v || "";
            const dateStr = row.c[1]?.f || "";
            const startTime = row.c[2]?.f || "";
            const endTime = row.c[3]?.f || "";
            const participants = row.c[4]?.v || "";
            const repeatInfo = row.c[5]?.v || "";
            const scheduleTable = row.c[6]?.v || ""; // 스케줄표 추가

            // 날짜 파싱 (YYYYMMDD 형식)
            const year = parseInt(dateStr.substring(0, 4));
            const month = parseInt(dateStr.substring(4, 6)) - 1;
            const day = parseInt(dateStr.substring(6, 8));

            // 기본 날짜
            const baseDate = new Date(year, month, day);

            // 반복 처리
            if (repeatInfo && repeatInfo !== "없음") {
              const daysInYear = 365;
              for (let i = 0; i < daysInYear; i++) {
                const checkDate = new Date(baseDate);
                checkDate.setDate(checkDate.getDate() + i);

                if (isMatchingRepeatDay(checkDate, repeatInfo)) {
                  processedEvents.push({
                    id: eventId,
                    title,
                    date: new Date(checkDate),
                    startTime,
                    endTime,
                    participants,
                    repeatInfo,
                    scheduleTable,
                  });
                  eventId++;
                }
              }
            } else {
              // 반복 없음
              processedEvents.push({
                id: eventId,
                title,
                date: baseDate,
                startTime,
                endTime,
                participants,
                repeatInfo: "없음",
                scheduleTable,
              });
              eventId++;
            }
          });

          setEvents(processedEvents);
        }
      } catch (error) {
        console.error("이벤트 로드 오류:", error);
      }
    };

    fetchEvents();
  }, []);

  // 반복 요건에 맞는지 확인
  const isMatchingRepeatDay = (checkDate, repeatInfo) => {
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const dayOfWeek = dayNames[checkDate.getDay()];

    // 정확한 요일 패턴 매칭 (예: "매주화요일"에서 "화요일" 추출)
    const dayPatterns = {
      "일": ["일요일", "매주일"],
      "월": ["월요일", "매주월"],
      "화": ["화요일", "매주화"],
      "수": ["수요일", "매주수"],
      "목": ["목요일", "매주목"],
      "금": ["금요일", "매주금"],
      "토": ["토요일", "매주토"],
    };

    const patterns = dayPatterns[dayOfWeek];
    for (let pattern of patterns) {
      if (repeatInfo.includes(pattern)) {
        return true;
      }
    }
    return false;
  };

  // 선택된 날짜의 이벤트 필터링
  useEffect(() => {
    const dateStr = date.toISOString().split("T")[0];
    const filtered = events.filter((event) => {
      const eventDateStr = event.date.toISOString().split("T")[0];
      return eventDateStr === dateStr;
    });
    setSelectedDateEvents(filtered);
  }, [date, events]);

  // 토요일 제외하는 타일 스타일 함수
  const getTileClassName = ({ date: tileDate }) => {
    const dayOfWeek = tileDate.getDay();
    // 토요일(6) 제외
    if (dayOfWeek === 6) {
      return "";
    }

    // 이벤트가 있는 날짜 표시
    const hasEvent = events.some((event) => {
      const eventDateStr = event.date.toISOString().split("T")[0];
      const tileDateStr = tileDate.toISOString().split("T")[0];
      return eventDateStr === tileDateStr;
    });

    return hasEvent ? "event-day" : "";
  };

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
            tileClassName={getTileClassName}
          />
        </div>
        <div className="selected-date">
          <p>
            선택된 날짜: <strong>{date.toLocaleDateString("ko-KR")}</strong>
          </p>

          {selectedDateEvents.length > 0 && (
            <div className="events-list">
              <h3>📌 예정된 강의</h3>
              {selectedDateEvents.map((event) => (
                <div
                  key={event.id}
                  className="event-item"
                  onClick={() => navigate(`/schedule/${event.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <h4>{event.title}</h4>
                  <p>
                    <strong>시간:</strong> {event.startTime} ~ {event.endTime}
                  </p>
                  <p>
                    <strong>참여자:</strong> {event.participants}
                  </p>
                  {event.repeatInfo !== "없음" && (
                    <p>
                      <strong>반복:</strong> {event.repeatInfo}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="footer">
        <p>✨ 매 순간을 소중히 ✨</p>
      </footer>
    </main>
  );
}

export default Home;
