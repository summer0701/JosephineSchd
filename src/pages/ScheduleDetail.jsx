import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

function ScheduleDetail() {
  const { scheduleIndex } = useParams();
  const navigate = useNavigate();
  const [scheduleData, setScheduleData] = useState([]);
  const [currentSchedule, setCurrentSchedule] = useState(null);

  // Google Sheets에서 스케줄 데이터 가져오기
  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const sheetId = "1b5Lw2NH1KgZz16DnEeDfDk4QUFjXjRFgG2g_g-s41Mk";
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq`;

        const response = await fetch(url);
        const text = await response.text();

        // Google Visualization API 응답 파싱
        const jsonStr = text.match(/\(({.*})\)/)[1];
        const data = JSON.parse(jsonStr);

        if (data.table && data.table.rows) {
          const schedules = data.table.rows
            .slice(1)
            .map((row) => ({
              title: row.c[0]?.v || "",
              date: row.c[1]?.f || "",
              startTime: row.c[2]?.f || "",
              endTime: row.c[3]?.f || "",
              participants: row.c[4]?.v || "",
              repeatInfo: row.c[5]?.v || "",
              scheduleTable: row.c[6]?.v || "", // 스케줄표 컬럼
            }));

          setScheduleData(schedules);
          setCurrentSchedule(schedules[parseInt(scheduleIndex)] || null);
        }
      } catch (error) {
        console.error("스케줄 데이터 로드 오류:", error);
      }
    };

    fetchSchedule();
  }, [scheduleIndex]);

  // 텍스트 table을 파싱해서 HTML 테이블로 변환
  const parseTableFromText = (text) => {
    if (!text || typeof text !== "string") return null;

    const lines = text.trim().split("\n").filter((line) => line.trim());

    if (lines.length === 0) return null;

    // 마크다운 테이블 형식 감지 (| 구분자)
    if (lines[0].includes("|")) {
      const rows = lines
        .filter((line) => {
          // 구분선 제거 (-, =로만 이루어진 행)
          const cleanLine = line.replace(/[|\s-=]/g, "");
          return cleanLine.length > 0;
        })
        .map((line) =>
          line
            .split("|")
            .map((cell) => cell.trim())
            .filter((cell) => cell)
        );

      if (rows.length > 1) {
        return {
          headers: rows[0],
          rows: rows.slice(1),
        };
      }
    }

    // TSV 형식 (탭으로 구분)
    if (lines[0].includes("\t")) {
      const rows = lines
        .filter((line) => {
          // 구분선 제거
          const cleanLine = line.replace(/[\t\s\-=]/g, "");
          return cleanLine.length > 0;
        })
        .map((line) =>
          line.split("\t").map((cell) => cell.trim())
        );

      if (rows.length > 1) {
        return {
          headers: rows[0],
          rows: rows.slice(1),
        };
      }
    }

    // 일반 공백으로 구분된 형식
    const rows = lines
      .filter((line) => {
        // 구분선 제거 (-, =로만 이루어진 행)
        const cleanLine = line.replace(/[\s\-=]/g, "");
        return cleanLine.length > 0;
      })
      .map((line) =>
        line
          .split(/\s{2,}/)
          .map((cell) => cell.trim())
          .filter((cell) => cell)
      );

    // 모든 행이 같은 개수의 컬럼을 가지는지 확인
    const colCount = rows[0]?.length;
    if (colCount && rows.every((row) => row.length === colCount)) {
      return {
        headers: rows[0],
        rows: rows.slice(1),
      };
    }

    return null;
  };

  const tableData = currentSchedule ? parseTableFromText(currentSchedule.scheduleTable) : null;

  if (!currentSchedule) {
    return (
      <main className="main-content">
        <div className="loading">로딩 중...</div>
      </main>
    );
  }

  return (
    <main className="main-content">
      <div className="schedule-detail">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← 뒤로 가기
        </button>

        <div className="detail-header">
          <h2>{currentSchedule.title}</h2>
        </div>

        <div className="schedule-table-container">
          <table className="schedule-table">
            <thead>
              <tr>
                <th>항목</th>
                <th>내용</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="label">📅 날짜</td>
                <td>{currentSchedule.date}</td>
              </tr>
              <tr>
                <td className="label">⏰ 시작 시간</td>
                <td>{currentSchedule.startTime}</td>
              </tr>
              <tr>
                <td className="label">⏱️ 종료 시간</td>
                <td>{currentSchedule.endTime}</td>
              </tr>
              <tr>
                <td className="label">👥 참여자</td>
                <td>{currentSchedule.participants}</td>
              </tr>
              <tr>
                <td className="label">🔄 반복 여부</td>
                <td>{currentSchedule.repeatInfo}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {tableData && (
          <div className="schedule-details-container">
            <h3>📋 상세 스케줄</h3>
            <div className="schedule-details-table-wrapper">
              <table className="beautiful-schedule-table">
                <thead>
                  <tr>
                    {tableData.headers.map((header, idx) => (
                      <th key={idx}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.rows.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {currentSchedule.scheduleTable && !tableData && (
          <div className="schedule-details-container">
            <h3>📋 상세 스케줄</h3>
            <div className="schedule-details-content">
              {currentSchedule.scheduleTable.split("\n").map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>
          </div>
        )}

        <div className="all-schedule-container">
          <h3>📋 전체 스케줄</h3>
          <div className="all-schedules-table">
            <table className="schedule-list-table">
              <thead>
                <tr>
                  <th>강의명</th>
                  <th>날짜</th>
                  <th>시간</th>
                  <th>참여자</th>
                  <th>반복</th>
                </tr>
              </thead>
              <tbody>
                {scheduleData.map((schedule, idx) => (
                  <tr
                    key={idx}
                    className={
                      idx === parseInt(scheduleIndex) ? "active-row" : ""
                    }
                  >
                    <td>{schedule.title}</td>
                    <td>{schedule.date}</td>
                    <td>
                      {schedule.startTime} ~ {schedule.endTime}
                    </td>
                    <td>{schedule.participants}</td>
                    <td>{schedule.repeatInfo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <footer className="footer">
        <p>✨ 매 순간을 소중히 ✨</p>
      </footer>
    </main>
  );
}

export default ScheduleDetail;
