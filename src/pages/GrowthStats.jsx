import React, { useEffect, useMemo, useState } from "react";

const LOGIN_USER_KEY = "josephineLoginUser";
const STATS_SHEET_ID = "1B3EHtBTg-uyolVGvJz0y5sP2Jj2NjGzR0nj17vLRsfY";
const STATS_SHEET_GID = "1719883233";

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

const toNumber = (value) => {
  const number = Number(String(value || "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
};

const clampScore = (value) => Math.max(0, Math.min(100, toNumber(value)));

const getColumn = (row, headers, names) => {
  const index = names
    .map((name) => headers.indexOf(name))
    .find((columnIndex) => columnIndex >= 0);

  return index >= 0 ? (row[index] || "").trim() : "";
};

const fetchStatsRows = async () => {
  const url = `https://docs.google.com/spreadsheets/d/${STATS_SHEET_ID}/gviz/tq?tqx=out:csv&gid=${STATS_SHEET_GID}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("성장 통계를 불러오지 못했습니다.");
  }

  const rows = parseCsv(await response.text());
  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim());

  return rows.slice(1).map((row, index) => ({
    id: `${row[0] || "row"}-${index}`,
    savedAt: getColumn(row, headers, ["저장시간", "saved_at"]),
    className: getColumn(row, headers, ["클래스명", "class_name", "class"]),
    studentName: getColumn(row, headers, ["학생이름", "student_name", "이름"]),
    type: getColumn(row, headers, ["타입", "type"]),
    totalCards: toNumber(getColumn(row, headers, ["전체카드수", "total_cards"])),
    successCards: toNumber(getColumn(row, headers, ["성공카드수", "success_cards"])),
    failedCards: toNumber(getColumn(row, headers, ["실패카드수", "failed_cards"])),
    totalAttempts: toNumber(getColumn(row, headers, ["총시도횟수", "total_attempts"])),
    cardAverageRate: clampScore(getColumn(row, headers, ["카드별평균일치율", "card_average_rate"])),
    overallAverageRate: clampScore(getColumn(row, headers, ["전체평균일치율", "overall_average_rate"])),
    finalScore: clampScore(getColumn(row, headers, ["최종점수", "final_score"])),
    earnedXp: toNumber(getColumn(row, headers, ["획득XP", "earned_xp"])),
    talk1: getColumn(row, headers, ["talk1"]),
    talk2: getColumn(row, headers, ["talk2"]),
    talk3: getColumn(row, headers, ["talk3"]),
  }));
};

const formatDate = (value) => value || "-";

const getAverage = (items, key) => {
  if (items.length === 0) {
    return 0;
  }

  return Math.round(items.reduce((total, item) => total + item[key], 0) / items.length);
};

const getTypeLabel = (type) => {
  if (type === "t1") return "t1";
  if (type === "t2-repeat") return "t2-repeat";
  if (type === "t2-translate") return "t2-translate";
  return type || "-";
};

const TREND_TYPES = [
  { type: "t1", label: "t1", labelOffset: -10 },
  { type: "t2-repeat", label: "t2", labelOffset: -10 },
  { type: "t2-translate", label: "t3", labelOffset: 18 },
];

const getTrendDateKey = (savedAt) => {
  const value = String(savedAt || "").trim();
  const dateOnly = value.split(/\s+(오전|오후)\s+/)[0]?.trim();
  return dateOnly || value || "-";
};

const getShortTrendDateLabel = (dateKey) => {
  const parts = String(dateKey || "").match(/\d+/g);

  if (parts && parts.length >= 3) {
    return `${Number(parts[1])}.${Number(parts[2])}`;
  }

  return dateKey;
};

const buildTypeSummary = (records) => {
  const typeOrder = ["t1", "t2-repeat", "t2-translate"];

  return typeOrder.map((type) => {
    const items = records.filter((record) => record.type === type);

    return {
      type,
      sessions: items.length,
      totalCards: items.reduce((total, item) => total + item.totalCards, 0),
      successCards: items.reduce((total, item) => total + item.successCards, 0),
      failedCards: items.reduce((total, item) => total + item.failedCards, 0),
      totalAttempts: items.reduce((total, item) => total + item.totalAttempts, 0),
      averageScore: getAverage(items, "finalScore"),
      averageRate: getAverage(items, "cardAverageRate"),
    };
  });
};

const DonutChart = ({ success, failed }) => {
  const total = Math.max(1, success + failed);
  const successPercent = Math.round((success / total) * 100);
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const dash = (successPercent / 100) * circumference;

  return (
    <div className="growth-donut">
      <svg viewBox="0 0 120 120" role="img" aria-label="성공 실패 카드 비율">
        <circle className="growth-donut-track" cx="60" cy="60" r={radius} />
        <circle
          className="growth-donut-value"
          cx="60"
          cy="60"
          r={radius}
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div>
        <strong>총 {success + failed}장</strong>
        <span>성공 {successPercent}%</span>
      </div>
    </div>
  );
};

const RadarChart = ({ values }) => {
  const labels = ["발음 정확도", "일치율", "완주율", "반복 성공", "학습 안정성"];
  const center = 120;
  const radius = 58;
  const points = values.map((value, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / values.length;
    const distance = (clampScore(value) / 100) * radius;
    return `${center + Math.cos(angle) * distance},${center + Math.sin(angle) * distance}`;
  });

  return (
    <div className="growth-radar">
      <svg viewBox="0 0 240 210" role="img" aria-label="핵심 역량 그래프">
        {[0.25, 0.5, 0.75, 1].map((scale) => {
          const ring = labels.map((_, index) => {
            const angle = -Math.PI / 2 + (index * 2 * Math.PI) / labels.length;
            return `${center + Math.cos(angle) * radius * scale},${center + Math.sin(angle) * radius * scale}`;
          });
          return <polygon className="growth-radar-ring" points={ring.join(" ")} key={scale} />;
        })}
        {labels.map((label, index) => {
          const angle = -Math.PI / 2 + (index * 2 * Math.PI) / labels.length;
          return (
            <g key={label}>
              <line
                className="growth-radar-axis"
                x1={center}
                y1={center}
                x2={center + Math.cos(angle) * radius}
                y2={center + Math.sin(angle) * radius}
              />
              <text
                x={center + Math.cos(angle) * (radius + 34)}
                y={center + Math.sin(angle) * (radius + 26)}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {label}
              </text>
            </g>
          );
        })}
        <polygon className="growth-radar-area" points={points.join(" ")} />
        <polyline className="growth-radar-line" points={`${points.join(" ")} ${points[0]}`} />
      </svg>
    </div>
  );
};

const TrendChart = ({ records }) => {
  const width = 640;
  const height = 240;
  const padding = 42;
  const dateKeys = [...new Set(records.map((record) => getTrendDateKey(record.savedAt)))].slice(-4);
  const safeDateKeys = dateKeys.length > 0 ? dateKeys : ["-"];
  const dailyTypeScores = safeDateKeys.reduce((map, dateKey) => {
    const dateRecords = records.filter((record) => getTrendDateKey(record.savedAt) === dateKey);

    map[dateKey] = TREND_TYPES.reduce((typeMap, item) => {
      const typeRecords = dateRecords.filter((record) => record.type === item.type);
      typeMap[item.type] = typeRecords.length > 0 ? getAverage(typeRecords, "cardAverageRate") : null;
      return typeMap;
    }, {});

    return map;
  }, {});
  const getX = (index) =>
    safeDateKeys.length === 1
      ? width / 2
      : padding + (index * (width - padding * 2)) / (safeDateKeys.length - 1);
  const getY = (value) => height - padding - (clampScore(value) * (height - padding * 2)) / 100;
  const getLinePoints = (type) =>
    safeDateKeys
      .map((dateKey, index) => {
        const score = dailyTypeScores[dateKey]?.[type];
        return score === null || score === undefined ? null : `${getX(index)},${getY(score)}`;
      })
      .filter(Boolean)
      .join(" ");

  return (
    <div className="growth-trend">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="일자별 타입 성장 추이">
        {[0, 25, 50, 75, 100].map((value) => (
          <g key={value}>
            <line
              className="growth-chart-grid"
              x1={padding}
              y1={getY(value)}
              x2={width - padding}
              y2={getY(value)}
            />
            <text className="growth-chart-y" x="6" y={getY(value) + 4}>
              {value}
            </text>
          </g>
        ))}
        {TREND_TYPES.map((item) => (
          <polyline
            className={`growth-chart-line ${item.type}`}
            points={getLinePoints(item.type)}
            key={item.type}
          />
        ))}
        {safeDateKeys.map((dateKey, index) => (
          <g key={dateKey}>
            {TREND_TYPES.map((item) => {
              const score = dailyTypeScores[dateKey]?.[item.type];

              if (score === null || score === undefined) {
                return null;
              }

              return (
                <g key={item.type}>
                  <circle
                    className={`growth-chart-dot ${item.type}`}
                    cx={getX(index)}
                    cy={getY(score)}
                    r="4"
                  />
                  <text
                    className={`growth-chart-score ${item.type}`}
                    x={getX(index)}
                    y={getY(score) + item.labelOffset}
                  >
                    {score}
                  </text>
                </g>
              );
            })}
            <text className="growth-chart-label" x={getX(index)} y={height - 8}>
              {getShortTrendDateLabel(dateKey)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

function GrowthStats() {
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState("성장 통계를 불러오는 중입니다.");
  const studentName = localStorage.getItem(LOGIN_USER_KEY) || "";

  useEffect(() => {
    const loadStats = async () => {
      try {
        const rows = await fetchStatsRows();
        const studentRows = rows.filter((row) => row.studentName === studentName);
        setRecords(studentRows);
        setStatus(studentRows.length > 0 ? "" : "아직 저장된 성장 통계가 없습니다.");
      } catch (error) {
        console.error("성장 통계 로딩 오류:", error);
        setStatus("성장 통계를 불러오지 못했습니다.");
      }
    };

    loadStats();
  }, [studentName]);

  const summary = useMemo(() => {
    const totalSessions = records.length;
    const totalCards = records.reduce((total, item) => total + item.totalCards, 0);
    const successCards = records.reduce((total, item) => total + item.successCards, 0);
    const failedCards = records.reduce((total, item) => total + item.failedCards, 0);
    const earnedXp = records.reduce((total, item) => total + item.earnedXp, 0);
    const recentScore = records[records.length - 1]?.finalScore || 0;
    const averageFinalScore = getAverage(records, "finalScore");
    const averageRate = getAverage(records, "cardAverageRate");
    const classes = [...new Set(records.map((item) => item.className).filter(Boolean))];
    const types = [...new Set(records.map((item) => item.type).filter(Boolean))];
    const t1Talk = [...records].reverse().find((item) => item.type === "t1" && (item.talk1 || item.talk2 || item.talk3));
    const typeSummary = buildTypeSummary(records);
    const completionRate = totalCards > 0 ? Math.round((successCards / totalCards) * 100) : 0;
    const repeatSuccess = records.length > 0 ? Math.round((successCards / records.length) * 20) : 0;
    const stability = Math.max(0, 100 - Math.round((failedCards / Math.max(1, totalCards)) * 100));

    return {
      totalSessions,
      totalCards,
      successCards,
      failedCards,
      earnedXp,
      recentScore,
      averageFinalScore,
      averageRate,
      classes,
      types,
      t1Talk,
      typeSummary,
      radarValues: [averageRate, averageFinalScore, completionRate, repeatSuccess, stability],
    };
  }, [records]);

  return (
    <main className="growth-page">
      <section className="growth-header">
        <div>
          <h2>나의 성장 통계</h2>
          <p>학생별 학습 성장 리포트</p>
        </div>
        <div className="growth-date">{new Date().toLocaleDateString("ko-KR")}</div>
      </section>

      {status ? (
        <div className="growth-empty">{status}</div>
      ) : (
        <>
          <section className="growth-overview">
            <article className="growth-profile">
              <div className="growth-avatar" aria-hidden="true">
                {studentName.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <h3>{studentName}</h3>
                <p>학생</p>
                <div className="growth-tags">
                  {summary.classes.map((className) => (
                    <span key={className}>{className}</span>
                  ))}
                </div>
                <div className="growth-tags">
                  {summary.types.map((type) => (
                    <span key={type}>{getTypeLabel(type)}</span>
                  ))}
                </div>
              </div>
            </article>

            <article className="growth-metric">
              <span>누적 학습 수</span>
              <strong>{summary.totalSessions}</strong>
              <small>회</small>
            </article>
            <article className="growth-metric">
              <span>평균 최종 점수</span>
              <strong>{summary.averageFinalScore}</strong>
              <small>점</small>
            </article>
            <article className="growth-metric">
              <span>누적 획득 XP</span>
              <strong>{summary.earnedXp}</strong>
              <small>XP</small>
            </article>
            <article className="growth-metric">
              <span>최근 결과</span>
              <strong>{summary.recentScore}</strong>
              <small>점</small>
            </article>
          </section>

          <section className="growth-grid">
            <article className="growth-panel">
              <h3>핵심 역량</h3>
              <RadarChart values={summary.radarValues} />
            </article>

            <article className="growth-panel growth-panel-wide">
              <div className="growth-panel-title">
                <h3>일자별 성장 추이</h3>
                <div>
                  <span>t1</span>
                  <span>t2</span>
                  <span>t3</span>
                </div>
              </div>
              <TrendChart records={records} />
            </article>

            <article className="growth-panel">
              <h3>성공 / 실패 카드</h3>
              <div className="growth-donut-layout">
                <DonutChart success={summary.successCards} failed={summary.failedCards} />
                <div className="growth-card-counts">
                  <p><span>성공 카드</span><strong>{summary.successCards}</strong></p>
                  <p><span>실패 카드</span><strong>{summary.failedCards}</strong></p>
                </div>
              </div>
            </article>

            <article className="growth-panel growth-panel-wide">
              <h3>타입별 요약</h3>
              <div className="growth-type-list">
                {summary.typeSummary.map((item) => (
                  <div className="growth-type-row" key={item.type}>
                    <span>{getTypeLabel(item.type)}</span>
                    <span>{item.sessions}회</span>
                    <span>
                      <i style={{ width: `${item.averageScore}%` }} />
                      {item.averageScore}점
                    </span>
                    <span>
                      <i style={{ width: `${item.averageRate}%` }} />
                      {item.averageRate}%
                    </span>
                    <strong>{item.successCards} / {item.failedCards}</strong>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="growth-teacher">
            <article>
              <h3>선생님의 한마디</h3>
              <p>{summary.t1Talk?.talk1 || "아직 선생님의 한마디가 없습니다."}</p>
            </article>
            <article className="good">
              <h3>잘한점</h3>
              <p>{summary.t1Talk?.talk2 || "아직 잘한점 기록이 없습니다."}</p>
            </article>
            <article className="needs">
              <h3>보완할점</h3>
              <p>{summary.t1Talk?.talk3 || "아직 보완할점 기록이 없습니다."}</p>
            </article>
          </section>

          <section className="growth-panel growth-recent">
            <h3>최근 학습 기록</h3>
            <div className="growth-table">
              <div className="growth-table-head">
                <span>저장시간</span>
                <span>클래스명</span>
                <span>타입</span>
                <span>전체카드수</span>
                <span>성공</span>
                <span>실패</span>
                <span>총시도횟수</span>
                <span>평균일치율</span>
                <span>최종점수</span>
                <span>XP</span>
              </div>
              {[...records].slice(-4).reverse().map((record) => (
                <div className="growth-table-row" key={record.id}>
                  <span data-label="저장시간">{formatDate(record.savedAt)}</span>
                  <span data-label="클래스명">{record.className}</span>
                  <span data-label="타입">{getTypeLabel(record.type)}</span>
                  <span data-label="전체카드수">{record.totalCards}</span>
                  <span data-label="성공">{record.successCards}</span>
                  <span data-label="실패">{record.failedCards}</span>
                  <span data-label="총시도횟수">{record.totalAttempts}</span>
                  <span data-label="평균일치율">{record.cardAverageRate}</span>
                  <span data-label="최종점수">{record.finalScore}</span>
                  <span data-label="XP">{record.earnedXp}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

export default GrowthStats;
