import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const LOGIN_USER_KEY = "josephineLoginUser";
const LOGIN_CLASS_KEY = "josephineLoginClass";

const FLASHCARD_SHEET_ID = "1_JXlTJ-iBaKrxRrGJLf9-KUljk_xiGID3K8uZ2sjcEo";
const XP_SHEET_ID = "1B3EHtBTg-uyolVGvJz0y5sP2Jj2NjGzR0nj17vLRsfY";
const XP_UPDATE_ENDPOINT = "";

const PASS_THRESHOLD = 60;
const XP_PER_SUCCESS_CARD = 1;
const XP_BONUSES = [
  { minAverage: 90, xp: 10 },
  { minAverage: 80, xp: 5 },
];

const FLASHCARD_COLUMNS = {
  className: ["class", "class_name", "클래스명"],
  type: ["type", "유형"],
  english: ["english", "en", "sentence", "영어", "영어문장"],
  korean: ["korean", "ko", "meaning", "한글", "뜻", "한글문장"],
};

const XP_COLUMNS = {
  className: ["class", "class_name", "클래스명"],
  studentName: ["student_name", "student", "name", "이름"],
  xp: ["xp", "XP"],
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

const hasHeaderRow = (row) => {
  const cells = row.map((cell) => cell.trim().toLowerCase());
  return cells.some((cell) =>
    Object.values(FLASHCARD_COLUMNS)
      .flat()
      .map((name) => name.toLowerCase())
      .includes(cell)
  );
};

const getColumnIndex = (headers, candidates, fallbackIndex) => {
  const normalizedHeaders = headers.map((header) => header.trim().toLowerCase());
  const normalizedCandidates = candidates.map((candidate) => candidate.toLowerCase());
  const foundIndex = normalizedHeaders.findIndex((header) =>
    normalizedCandidates.includes(header)
  );

  return foundIndex >= 0 ? foundIndex : fallbackIndex;
};

const normalizeText = (text) =>
  text
    .toLowerCase()
    .replace(/[.,!?;:"'()\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getWords = (text) => normalizeText(text).split(" ").filter(Boolean);

const getWordFrequency = (words) =>
  words.reduce((map, word) => {
    map[word] = (map[word] || 0) + 1;
    return map;
  }, {});

const getOrderedSimilarity = (targetWords, spokenWords) => {
  const table = Array.from({ length: targetWords.length + 1 }, () =>
    Array(spokenWords.length + 1).fill(0)
  );

  for (let i = 1; i <= targetWords.length; i += 1) {
    for (let j = 1; j <= spokenWords.length; j += 1) {
      table[i][j] =
        targetWords[i - 1] === spokenWords[j - 1]
          ? table[i - 1][j - 1] + 1
          : Math.max(table[i - 1][j], table[i][j - 1]);
    }
  }

  return table[targetWords.length][spokenWords.length] / targetWords.length;
};

const getKeywordSimilarity = (targetWords, spokenWords) => {
  const spokenFrequency = getWordFrequency(spokenWords);
  const matchedCount = targetWords.reduce((count, word) => {
    if (!spokenFrequency[word]) {
      return count;
    }

    spokenFrequency[word] -= 1;
    return count + 1;
  }, 0);

  return matchedCount / targetWords.length;
};

const calculateSimilarity = (targetText, spokenText) => {
  const targetWords = getWords(targetText);
  const spokenWords = getWords(spokenText);

  if (targetWords.length === 0 || spokenWords.length === 0) {
    return 0;
  }

  if (normalizeText(targetText) === normalizeText(spokenText)) {
    return 100;
  }

  const orderedScore = getOrderedSimilarity(targetWords, spokenWords);
  const keywordScore = getKeywordSimilarity(targetWords, spokenWords);
  const lengthPenalty = Math.min(targetWords.length, spokenWords.length) / Math.max(targetWords.length, spokenWords.length);
  const combinedScore = keywordScore * 0.65 + orderedScore * 0.25 + lengthPenalty * 0.1;

  return Math.max(0, Math.min(100, Math.round(combinedScore * 100)));
};

const calculateResults = (cards) => {
  const totalCards = cards.length;
  const successCards = cards.filter((card) => card.passed).length;
  const totalAttempts = cards.reduce((total, card) => total + card.attempts, 0);
  const totalBestScore = cards.reduce((total, card) => total + card.bestScore, 0);
  const overallAverage = totalCards > 0 ? Math.round(totalBestScore / totalCards) : 0;
  const bonus = XP_BONUSES.find((item) => overallAverage >= item.minAverage)?.xp || 0;

  return {
    totalCards,
    successCards,
    failedCards: totalCards - successCards,
    totalAttempts,
    cardAverage: overallAverage,
    overallAverage,
    finalScore: overallAverage,
    earnedXp: successCards * XP_PER_SUCCESS_CARD + bonus,
  };
};

const getRecognitionConstructor = () =>
  window.SpeechRecognition || window.webkitSpeechRecognition;

const speakEnglish = (text, onUnsupported, onDone) => {
  if (!window.speechSynthesis) {
    onUnsupported();
    onDone();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  utterance.onend = onDone;
  utterance.onerror = onDone;
  window.speechSynthesis.speak(utterance);
};

const fetchFlashcards = async (className) => {
  const url = `https://docs.google.com/spreadsheets/d/${FLASHCARD_SHEET_ID}/gviz/tq?tqx=out:csv&gid=0`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("플래시카드 데이터를 불러오지 못했습니다.");
  }

  const rows = parseCsv(await response.text());
  if (rows.length === 0) {
    return [];
  }

  const firstRowIsHeader = hasHeaderRow(rows[0]);
  const headers = firstRowIsHeader ? rows[0] : [];
  const dataRows = firstRowIsHeader ? rows.slice(1) : rows;
  const classIndex = firstRowIsHeader ? getColumnIndex(headers, FLASHCARD_COLUMNS.className, 0) : 0;
  const typeIndex = firstRowIsHeader ? getColumnIndex(headers, FLASHCARD_COLUMNS.type, 1) : 1;
  const englishIndex = firstRowIsHeader ? getColumnIndex(headers, FLASHCARD_COLUMNS.english, 2) : 2;
  const koreanIndex = firstRowIsHeader ? getColumnIndex(headers, FLASHCARD_COLUMNS.korean, 3) : 3;

  return dataRows
    .map((row, index) => ({
      id: `${row[classIndex] || "class"}-${row[typeIndex] || "type"}-${index}`,
      className: (row[classIndex] || "").trim(),
      type: (row[typeIndex] || "").trim(),
      english: (row[englishIndex] || "").trim(),
      korean: (row[koreanIndex] || "").trim(),
      attempts: 0,
      bestScore: 0,
      passed: false,
      skipped: false,
      lastSpokenText: "",
      lastScore: null,
    }))
    .filter((card) => card.className === className && ["t1", "t2"].includes(card.type) && card.english)
    .sort((a, b) => a.type.localeCompare(b.type));
};

const fetchStudentXp = async (studentName, className) => {
  const url = `https://docs.google.com/spreadsheets/d/${XP_SHEET_ID}/gviz/tq?tqx=out:csv`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("학생 XP 데이터를 불러오지 못했습니다.");
  }

  const rows = parseCsv(await response.text());
  if (rows.length < 2) {
    return { currentXp: 0, rowIndex: null };
  }

  const headers = rows[0];
  const classIndex = getColumnIndex(headers, XP_COLUMNS.className, 0);
  const nameIndex = getColumnIndex(headers, XP_COLUMNS.studentName, 1);
  const xpIndex = getColumnIndex(headers, XP_COLUMNS.xp, 3);
  const rowIndex = rows.findIndex(
    (row, index) =>
      index > 0 &&
      (row[nameIndex] || "").trim() === studentName &&
      (!className || (row[classIndex] || "").trim() === className)
  );

  if (rowIndex < 0) {
    return { currentXp: 0, rowIndex: null };
  }

  return {
    currentXp: Number(rows[rowIndex][xpIndex] || 0),
    rowIndex: rowIndex + 1,
  };
};

const saveXp = async ({ studentName, className, sessionId, earnedXp, result }) => {
  const paidSessions = JSON.parse(localStorage.getItem("speakRankPaidSessions") || "[]");
  if (paidSessions.includes(sessionId)) {
    return { ok: true, duplicate: true, message: "이미 지급된 학습 세션입니다." };
  }

  const { currentXp, rowIndex } = await fetchStudentXp(studentName, className);
  const nextXp = currentXp + earnedXp;
  const payload = {
    student_name: studentName,
    class_name: className,
    session_id: sessionId,
    earned_xp: earnedXp,
    previous_xp: currentXp,
    next_xp: nextXp,
    row_index: rowIndex,
    result,
  };

  if (!XP_UPDATE_ENDPOINT) {
    throw Object.assign(new Error("XP 업데이트 엔드포인트가 설정되지 않았습니다."), { payload });
  }

  const response = await fetch(XP_UPDATE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw Object.assign(new Error("XP 저장 요청이 실패했습니다."), { payload });
  }

  localStorage.setItem("speakRankPaidSessions", JSON.stringify([...paidSessions, sessionId]));
  return { ok: true, duplicate: false, previousXp: currentXp, nextXp };
};

const saveXpWithFallback = async (payload) => {
  try {
    return await saveXp(payload);
  } catch (error) {
    const pendingItems = JSON.parse(localStorage.getItem("speakRankPendingXp") || "[]");
    const fallbackPayload = error.payload || payload;
    localStorage.setItem(
      "speakRankPendingXp",
      JSON.stringify([
        ...pendingItems,
        {
          ...fallbackPayload,
          saved_at: new Date().toISOString(),
          error: error.message,
        },
      ])
    );

    return { ok: false, message: error.message };
  }
};

function Flashcards() {
  const navigate = useNavigate();
  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");
  const sessionIdRef = useRef(`speakrank-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const [studentName, setStudentName] = useState("");
  const [className, setClassName] = useState("");
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState("학습 데이터를 불러오는 중입니다.");
  const [isLoading, setIsLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [xpSaveResult, setXpSaveResult] = useState(null);

  const currentCard = cards[currentIndex];
  const results = useMemo(() => calculateResults(cards), [cards]);

  useEffect(() => {
    const savedStudentName = localStorage.getItem(LOGIN_USER_KEY);
    const savedClassName = localStorage.getItem(LOGIN_CLASS_KEY);

    if (!savedStudentName) {
      navigate("/");
      return;
    }

    setStudentName(savedStudentName);
    setClassName(savedClassName || "class1");
  }, [navigate]);

  useEffect(() => {
    if (!className) {
      return;
    }

    const loadCards = async () => {
      setIsLoading(true);
      setStatusMessage("플래시카드를 불러오는 중입니다.");

      try {
        const loadedCards = await fetchFlashcards(className);
        setCards(loadedCards);
        setCurrentIndex(0);
        setIsCompleted(false);
        setXpSaveResult(null);
        setStatusMessage(
          loadedCards.length > 0
            ? "시작할 준비가 되었습니다."
            : "학습할 t1, t2 카드가 없습니다."
        );
      } catch (error) {
        console.error("플래시카드 로딩 오류:", error);
        setStatusMessage("Google Sheets에서 플래시카드를 불러오지 못했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    loadCards();
  }, [className]);

  useEffect(() => {
    if (!currentCard || currentCard.type !== "t1" || isCompleted) {
      return;
    }

    setIsSpeaking(true);
    speakEnglish(
      currentCard.english,
      () => setStatusMessage("TTS가 지원되지 않아 텍스트만 보고 진행합니다."),
      () => setIsSpeaking(false)
    );
  }, [currentCard?.id, currentCard, isCompleted]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const moveToNextCard = (sourceCards = cards) => {
    if (currentIndex >= cards.length - 1) {
      finishStudy(sourceCards);
      return;
    }

    setCurrentIndex((index) => index + 1);
    setStatusMessage("다음 카드를 시작합니다.");
  };

  const finishStudy = async (sourceCards = cards) => {
    setIsCompleted(true);
    setStatusMessage("학습이 완료되었습니다.");

    const finalResults = calculateResults(sourceCards);
    const saveResult = await saveXpWithFallback({
      studentName,
      className,
      sessionId: sessionIdRef.current,
      earnedXp: finalResults.earnedXp,
      result: finalResults,
    });

    setXpSaveResult(saveResult);
  };

  const applySpokenText = (spokenText) => {
    const targetText = currentCard.english;
    const nextScore = calculateSimilarity(targetText, spokenText);
    const passed = nextScore >= PASS_THRESHOLD;
    let nextCards = cards;

    setCards((previousCards) => {
      nextCards = previousCards.map((card, index) =>
        index === currentIndex
          ? {
              ...card,
              attempts: card.attempts + 1,
              bestScore: Math.max(card.bestScore, nextScore),
              passed: card.passed || passed,
              lastSpokenText: spokenText,
              lastScore: nextScore,
            }
          : card
      );
      return nextCards;
    });

    setStatusMessage(
      passed
        ? `정답 인정입니다. 일치율 ${nextScore}%`
        : `일치율 ${nextScore}%입니다. 다시 말해 주세요.`
    );

    if (passed) {
      window.setTimeout(() => moveToNextCard(nextCards), 700);
    }
  };

  const startListening = () => {
    const SpeechRecognition = getRecognitionConstructor();

    if (!SpeechRecognition) {
      setStatusMessage("이 브라우저는 STT를 지원하지 않습니다. Chrome에서 다시 시도해 주세요.");
      return;
    }

    transcriptRef.current = "";
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      setStatusMessage("듣는 중입니다. 영어로 말해 주세요.");
    };

    recognition.onresult = (event) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        text = `${text} ${event.results[i][0]?.transcript || ""}`.trim();
      }
      transcriptRef.current = text || transcriptRef.current;
    };

    recognition.onerror = (event) => {
      setStatusMessage(
        event.error === "not-allowed"
          ? "마이크 권한이 없습니다. 브라우저 주소창의 권한 설정에서 마이크를 허용해 주세요."
          : "STT 인식에 실패했습니다. 다시 말하기 버튼을 눌러 주세요."
      );
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      const spokenText = transcriptRef.current.trim();

      if (!spokenText) {
        setStatusMessage("STT 인식에 실패했습니다. 다시 말하기 버튼을 눌러 주세요.");
        return;
      }

      applySpokenText(spokenText);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const skipCard = () => {
    let nextCards = cards;
    setCards((previousCards) => {
      nextCards = previousCards.map((card, index) =>
        index === currentIndex
          ? {
              ...card,
              skipped: true,
              attempts: card.attempts || 1,
            }
          : card
      );
      return nextCards;
    });
    window.setTimeout(() => moveToNextCard(nextCards), 0);
  };

  const restartStudy = () => {
    sessionIdRef.current = `speakrank-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setCards((previousCards) =>
      previousCards.map((card) => ({
        ...card,
        attempts: 0,
        bestScore: 0,
        passed: false,
        skipped: false,
        lastSpokenText: "",
        lastScore: null,
      }))
    );
    setCurrentIndex(0);
    setIsCompleted(false);
    setXpSaveResult(null);
    setStatusMessage("새 학습 세션을 시작합니다.");
  };

  if (isCompleted) {
    return (
      <main className="flashcard-page">
        <section className="flashcard-shell flashcard-results">
          <div className="flashcard-topline">
            <span>{studentName}</span>
            <span>{className}</span>
          </div>
          <h2>학습 결과</h2>

          <div className="flashcard-result-grid">
            <div><span>전체 카드 수</span><strong>{results.totalCards}</strong></div>
            <div><span>성공한 카드 수</span><strong>{results.successCards}</strong></div>
            <div><span>실패한 카드 수</span><strong>{results.failedCards}</strong></div>
            <div><span>총 시도 횟수</span><strong>{results.totalAttempts}</strong></div>
            <div><span>카드별 평균 일치율</span><strong>{results.cardAverage}%</strong></div>
            <div><span>전체 평균 일치율</span><strong>{results.overallAverage}%</strong></div>
            <div><span>최종 점수</span><strong>{results.finalScore}점</strong></div>
            <div><span>획득 XP</span><strong>{results.earnedXp} XP</strong></div>
          </div>

          <div className={`flashcard-xp-status ${xpSaveResult?.ok ? "success" : "failed"}`}>
            {xpSaveResult?.ok
              ? "XP 업데이트 성공"
              : "XP 저장 실패: 로컬에 임시 저장했습니다."}
          </div>

          <div className="flashcard-review-list">
            {cards.map((card, index) => (
              <div className="flashcard-review-item" key={card.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{card.type === "t2" ? card.korean : card.english}</p>
                <strong>{card.bestScore}%</strong>
              </div>
            ))}
          </div>

          <button className="flashcard-primary-button" type="button" onClick={restartStudy}>
            다시 시작
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="flashcard-page">
      <section className="flashcard-shell">
        <div className="flashcard-topline">
          <span>SpeakRank</span>
          <span>{studentName} · {className}</span>
        </div>

        <div className="flashcard-progress">
          <span>{cards.length > 0 ? `${currentIndex + 1} / ${cards.length}` : "0 / 0"}</span>
          <span>통과 기준 {PASS_THRESHOLD}%</span>
        </div>

        <div className={`flashcard-card ${currentCard?.type || ""}`}>
          {isLoading ? (
            <p className="flashcard-main-text">학습 데이터를 불러오는 중입니다.</p>
          ) : currentCard ? (
            <>
              <span className="flashcard-type">{currentCard.type}</span>
              <p className="flashcard-main-text">
                {currentCard.type === "t2" ? currentCard.korean : currentCard.english}
              </p>
              {currentCard.type === "t2" && (
                <p className="flashcard-sub-text">위 문장을 영어로 말해 주세요.</p>
              )}
            </>
          ) : (
            <p className="flashcard-main-text">학습할 카드가 없습니다.</p>
          )}
        </div>

        <div className="flashcard-actions">
          <button
            className="flashcard-secondary-button"
            type="button"
            onClick={() => {
              if (!currentCard) return;
              setIsSpeaking(true);
              speakEnglish(
                currentCard.english,
                () => setStatusMessage("TTS가 지원되지 않아 텍스트만 보고 진행합니다."),
                () => setIsSpeaking(false)
              );
            }}
            disabled={!currentCard || isSpeaking}
          >
            {isSpeaking ? "읽는 중" : "TTS 듣기"}
          </button>
          <button
            className="flashcard-primary-button"
            type="button"
            onClick={startListening}
            disabled={!currentCard || isListening || isSpeaking}
          >
            {isListening ? "듣는 중" : currentCard?.lastSpokenText ? "다시 말하기" : "말하기 시작"}
          </button>
          <button
            className="flashcard-secondary-button"
            type="button"
            onClick={skipCard}
            disabled={!currentCard || isListening}
          >
            카드 실패 처리
          </button>
        </div>

        <p className="flashcard-status">{statusMessage}</p>

        {currentCard && (
          <div className="flashcard-feedback">
            {currentCard.type === "t1" ? (
              <>
                <p><span>원문 문장</span>{currentCard.english}</p>
                <p><span>사용자가 말한 문장</span>{currentCard.lastSpokenText || "-"}</p>
                <p><span>일치율</span>{currentCard.lastScore ?? "-"}{currentCard.lastScore !== null ? "%" : ""}</p>
                <p><span>정답 인정 여부</span>{currentCard.passed ? "통과" : "미통과"}</p>
              </>
            ) : (
              <>
                <p><span>한글 문장</span>{currentCard.korean}</p>
                <p><span>정답 영어 문장</span>{currentCard.english}</p>
                <p><span>사용자가 말한 영어 문장</span>{currentCard.lastSpokenText || "-"}</p>
                <p><span>일치율</span>{currentCard.lastScore ?? "-"}{currentCard.lastScore !== null ? "%" : ""}</p>
                <p><span>정답 인정 여부</span>{currentCard.passed ? "정답 인정" : "미통과"}</p>
              </>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

export default Flashcards;
