import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const LOGIN_USER_KEY = "josephineLoginUser";
const LOGIN_CLASS_KEY = "josephineLoginClass";

const FLASHCARD_SHEET_ID = "1_JXlTJ-iBaKrxRrGJLf9-KUljk_xiGID3K8uZ2sjcEo";
const XP_SHEET_ID = "1B3EHtBTg-uyolVGvJz0y5sP2Jj2NjGzR0nj17vLRsfY";
const XP_UPDATE_ENDPOINT =
  process.env.REACT_APP_XP_UPDATE_ENDPOINT ||
  "https://script.google.com/macros/s/AKfycbzaI8gGIQpdoKTj8gsVf19-fhXw9yMLEk03XAioA4kthbq__UXXL0zSBFVp4P6mu1ETPA/exec";
const STATS_UPDATE_ENDPOINT =
  process.env.REACT_APP_STATS_UPDATE_ENDPOINT ||
  "https://script.google.com/macros/s/AKfycbwqRrcibIy_4Qwt6-2cUmxTOHBXZNXHmvx9xpAN_ZFY3EKMH8d_VLiITIlyrhHaV1lvOg/exec";

const PASS_THRESHOLD = 60;
const AUTO_PASS_ATTEMPT_COUNT = 5;
const XP_PER_SUCCESS_CARD = 1;
const XP_BONUSES = [
  { minAverage: 90, xp: 10 },
  { minAverage: 80, xp: 5 },
];

const PART_INFO_BY_PHASE = {
  t1: {
    key: "part1",
    title: "Part 1. Words 단어",
    description: "영어 단어를 보고 뜻을 확인하는 단어 체크 단계입니다.",
    helper: "단어의 의미를 알고 있는지 빠르게 확인합니다.",
  },
  "t2-repeat": {
    key: "part2",
    title: "Part 2. 영어 따라 말하기",
    description: "화면에 나오는 영어 문장을 듣고 그대로 따라 말하는 단계입니다.",
    helper: "TTS가 먼저 문장을 읽어주면, 사용자는 같은 문장을 말합니다. 발음과 일치율을 확인합니다.",
  },
  "t2-translate": {
    key: "part3",
    title: "Part 3. 영작하기",
    description: "한글 문장을 보고 영어 문장을 만드는 단계입니다.",
    helper: "단어를 스크램블드 해서 주고 배열하는 학습입니다.",
  },
};

const FLASHCARD_COLUMNS = {
  className: ["class", "class_name", "클래스명"],
  type: ["type", "유형"],
  english: ["english", "en", "sentence", "영어", "영어문장"],
  korean: ["korean", "ko", "meaning", "한글", "뜻", "한글문장"],
  pronunciationGuide: ["pronunciation", "pronunciation_guide", "guide", "발음", "발음가이드"],
};

const FLASHCARD_FALLBACK_COLUMN_INDEX = {
  className: 0,
  type: 1,
  english: 2,
  korean: 3,
  pronunciationGuide: 4,
};

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

const getLetters = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .split("");

const getWordFrequency = (words) =>
  words.reduce((map, word) => {
    map[word] = (map[word] || 0) + 1;
    return map;
  }, {});

const maskEnglishAnswer = (text) =>
  text.replace(/[A-Za-z]/g, "_");

const getT2TranslateAnswerDisplay = (card) => {
  if (card.attempts >= 2) {
    return card.english;
  }

  if (card.attempts >= 1) {
    return maskEnglishAnswer(card.english);
  }

  return "3번째 시도부터 표시됩니다.";
};

const getCompositionWords = (text) =>
  getWords(text).map((word, index) => ({
    id: `${word}-${index}`,
    text: word,
  }));

const getSeedValue = (text) =>
  text.split("").reduce((total, char) => total + char.charCodeAt(0), 0);

const shuffleCompositionWords = (text, seedText) => {
  const words = getCompositionWords(text);
  const shuffledWords = [...words];
  let seed = getSeedValue(seedText || text) || 1;

  for (let i = shuffledWords.length - 1; i > 0; i -= 1) {
    seed = (seed * 9301 + 49297) % 233280;
    const nextIndex = seed % (i + 1);
    [shuffledWords[i], shuffledWords[nextIndex]] = [shuffledWords[nextIndex], shuffledWords[i]];
  }

  if (
    shuffledWords.length > 1 &&
    shuffledWords.every((word, index) => word.id === words[index].id)
  ) {
    [shuffledWords[0], shuffledWords[shuffledWords.length - 1]] = [
      shuffledWords[shuffledWords.length - 1],
      shuffledWords[0],
    ];
  }

  return shuffledWords;
};

const getSpokenCompositionAnswer = (wordBank, spokenText) => {
  const availableWords = [...wordBank];
  const spokenWords = getWords(spokenText);

  return spokenWords.reduce((answer, spokenWord) => {
    const matchedIndex = availableWords.findIndex(
      (word) => normalizeText(word.text) === spokenWord
    );

    if (matchedIndex < 0) {
      return answer;
    }

    const [matchedWord] = availableWords.splice(matchedIndex, 1);
    return [...answer, matchedWord];
  }, []);
};

const getMissingWords = (targetText, answerText) => {
  const answerFrequency = getWordFrequency(getWords(answerText));

  return getWords(targetText).filter((word) => {
    if (!answerFrequency[word]) {
      return true;
    }

    answerFrequency[word] -= 1;
    return false;
  });
};

const getWrongAnalysis = (cards, phase) => {
  const wrongCards = cards.filter(
    (card) => card.phase === phase && (!card.passed || card.skipped)
  );

  if (wrongCards.length === 0) {
    return "";
  }

  const missingWords = wrongCards.flatMap((card) =>
    getMissingWords(card.english, card.lastSpokenText || "")
  );

  return [...new Set(missingWords)].join(", ");
};

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

const calculateLetterSimilarity = (targetText, spokenText) => {
  const targetLetters = getLetters(targetText);
  const spokenLetters = getLetters(spokenText);

  if (targetLetters.length === 0 || spokenLetters.length === 0) {
    return 0;
  }

  const orderedScore = getOrderedSimilarity(targetLetters, spokenLetters);
  const keywordScore = getKeywordSimilarity(targetLetters, spokenLetters);
  const combinedScore = keywordScore * 0.65 + orderedScore * 0.35;

  return Math.max(0, Math.min(100, Math.round(combinedScore * 100)));
};

const calculateResults = (cards) => {
  const getPartSummary = (phase) => {
    const partCards = cards.filter((card) => card.phase === phase);
    const totalCards = partCards.length;
    const successCards = partCards.filter((card) => card.passed).length;
    const totalAttempts = partCards.reduce((total, card) => total + card.attempts, 0);
    const totalBestScore = partCards.reduce((total, card) => total + card.bestScore, 0);
    const averageScore = totalCards > 0 ? Math.round(totalBestScore / totalCards) : 0;

    return {
      totalCards,
      successCards,
      failedCards: totalCards - successCards,
      totalAttempts,
      averageScore,
      finalScore: averageScore,
    };
  };

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
    parts: {
      part1: getPartSummary("t1"),
      part2: getPartSummary("t2-repeat"),
      part3: getPartSummary("t2-translate"),
    },
  };
};

const getRecognitionConstructor = () =>
  window.SpeechRecognition || window.webkitSpeechRecognition;

const playTone = (audioContext, frequency, startTime, duration, gainValue = 0.14) => {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
};

const playSuccessSound = () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;

  if (!AudioContext) {
    return;
  }

  const audioContext = new AudioContext();
  const now = audioContext.currentTime;

  playTone(audioContext, 659, now, 0.13);
  playTone(audioContext, 784, now + 0.1, 0.14);
  playTone(audioContext, 1047, now + 0.21, 0.2, 0.12);

  window.setTimeout(() => {
    audioContext.close();
  }, 650);
};

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
  const classIndex = firstRowIsHeader
    ? getColumnIndex(headers, FLASHCARD_COLUMNS.className, FLASHCARD_FALLBACK_COLUMN_INDEX.className)
    : FLASHCARD_FALLBACK_COLUMN_INDEX.className;
  const typeIndex = firstRowIsHeader
    ? getColumnIndex(headers, FLASHCARD_COLUMNS.type, FLASHCARD_FALLBACK_COLUMN_INDEX.type)
    : FLASHCARD_FALLBACK_COLUMN_INDEX.type;
  const englishIndex = firstRowIsHeader
    ? getColumnIndex(headers, FLASHCARD_COLUMNS.english, FLASHCARD_FALLBACK_COLUMN_INDEX.english)
    : FLASHCARD_FALLBACK_COLUMN_INDEX.english;
  const koreanIndex = firstRowIsHeader
    ? getColumnIndex(headers, FLASHCARD_COLUMNS.korean, FLASHCARD_FALLBACK_COLUMN_INDEX.korean)
    : FLASHCARD_FALLBACK_COLUMN_INDEX.korean;
  const pronunciationGuideIndex = firstRowIsHeader
    ? getColumnIndex(
        headers,
        FLASHCARD_COLUMNS.pronunciationGuide,
        FLASHCARD_FALLBACK_COLUMN_INDEX.pronunciationGuide
      )
    : FLASHCARD_FALLBACK_COLUMN_INDEX.pronunciationGuide;

  const sourceCards = dataRows
    .map((row, index) => ({
      sourceId: `${row[classIndex] || "class"}-${row[typeIndex] || "type"}-${index}`,
      className: (row[classIndex] || "").trim(),
      type: (row[typeIndex] || "").trim(),
      english: (row[englishIndex] || "").trim(),
      korean: (row[koreanIndex] || "").trim(),
      pronunciationGuide: (row[pronunciationGuideIndex] || "").trim(),
      attempts: 0,
      bestScore: 0,
      passed: false,
      skipped: false,
      lastSpokenText: "",
      lastScore: null,
    }))
    .filter((card) => card.className === className && ["t1", "t2"].includes(card.type) && card.english)
    .sort((a, b) => a.type.localeCompare(b.type));

  const t1Cards = sourceCards
    .filter((card) => card.type === "t1")
    .map((card) => ({
      ...card,
      id: `${card.sourceId}-t1`,
      phase: "t1",
      phaseLabel: "T1",
    }));

  const t2RepeatCards = sourceCards
    .filter((card) => card.type === "t2")
    .map((card) => ({
      ...card,
      id: `${card.sourceId}-repeat`,
      phase: "t2-repeat",
      phaseLabel: "T2 1단계",
    }));

  const t2TranslateCards = sourceCards
    .filter((card) => card.type === "t2")
    .map((card) => ({
      ...card,
      id: `${card.sourceId}-translate`,
      phase: "t2-translate",
      phaseLabel: "T2 2단계",
      wordBank: shuffleCompositionWords(card.english, card.sourceId),
      compositionAnswer: [],
      attempts: 0,
      bestScore: 0,
      passed: false,
      skipped: false,
      lastSpokenText: "",
      lastScore: null,
    }));

  return [...t1Cards, ...t2RepeatCards, ...t2TranslateCards];
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

const saveXp = async ({ studentName, className, sessionId, earnedXp, result, cards }) => {
  const paidSessions = JSON.parse(localStorage.getItem("speakRankPaidSessions") || "[]");
  if (paidSessions.includes(sessionId)) {
    return { ok: true, duplicate: true, message: "이미 지급된 학습 세션입니다." };
  }

  const { currentXp, rowIndex } = await fetchStudentXp(studentName, className);
  const nextXp = currentXp + earnedXp;
  const payload = {
    class_name: className,
    student_name: studentName,
    earned_xp: earnedXp,
    session_id: sessionId,
    previous_xp: currentXp,
    next_xp: nextXp,
    row_index: rowIndex,
  };

  if (!XP_UPDATE_ENDPOINT) {
    throw Object.assign(new Error("XP 업데이트 엔드포인트가 설정되지 않았습니다."), { payload });
  }

  await fetch(XP_UPDATE_ENDPOINT, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });

  const statsPayloads = [
    { type: "t1", result: result.parts.part1 },
    { type: "t2-repeat", result: result.parts.part2 },
    { type: "t2-translate", result: result.parts.part3 },
  ].map((item) => ({
    class_name: className,
    student_name: studentName,
    type: item.type,
    total_cards: item.result.totalCards,
    success_cards: item.result.successCards,
    failed_cards: item.result.failedCards,
    total_attempts: item.result.totalAttempts,
    card_average_rate: item.result.averageScore,
    overall_average_rate: result.overallAverage,
    final_score: item.result.finalScore,
    earned_xp: item.type === "t2-translate" ? earnedXp : 0,
    wrong: getWrongAnalysis(cards || [], item.type),
  }));

  await Promise.all(
    statsPayloads.map(async (statsPayload) => {
      await fetch(STATS_UPDATE_ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(statsPayload),
      });
    })
  );

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
  const autoTtsCardIdsRef = useRef(new Set());
  const autoSttCardIdsRef = useRef(new Set());
  const pendingInitialTtsCardIdRef = useRef("");
  const [studentName, setStudentName] = useState("");
  const [className, setClassName] = useState("");
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState("학습 데이터를 불러오는 중입니다.");
  const [isLoading, setIsLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [partCheckpoint, setPartCheckpoint] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [xpSaveResult, setXpSaveResult] = useState(null);
  const [studentCoin, setStudentCoin] = useState(0);
  const [compositionAnswer, setCompositionAnswer] = useState([]);
  const [draggedBankWord, setDraggedBankWord] = useState(null);
  const [draggedAnswerIndex, setDraggedAnswerIndex] = useState(null);

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
        setHasStarted(false);
        setPartCheckpoint(null);
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
    if (!studentName || !className) {
      return;
    }

    const loadStudentCoin = async () => {
      try {
        const { currentXp } = await fetchStudentXp(studentName, className);
        setStudentCoin(currentXp);
      } catch (error) {
        console.error("코인 로딩 오류:", error);
      }
    };

    loadStudentCoin();
  }, [studentName, className]);

  useEffect(() => {
    setCompositionAnswer(currentCard?.compositionAnswer || []);
    setDraggedBankWord(null);
    setDraggedAnswerIndex(null);
  }, [currentCard?.id, currentCard]);

  useEffect(() => {
    const shouldAutoPlayTts =
      ["t1", "t2-repeat"].includes(currentCard?.phase) &&
      !autoTtsCardIdsRef.current.has(currentCard.id);

    if (
      !currentCard ||
      !hasStarted ||
      partCheckpoint ||
      isCompleted ||
      !shouldAutoPlayTts
    ) {
      return;
    }

    autoTtsCardIdsRef.current.add(currentCard.id);
    pendingInitialTtsCardIdRef.current = currentCard.id;
    setIsSpeaking(true);
    speakEnglish(
      currentCard.english,
      () => setStatusMessage("TTS가 지원되지 않아 텍스트만 보고 진행합니다."),
      () => {
        pendingInitialTtsCardIdRef.current = "";
        setIsSpeaking(false);
        window.setTimeout(() => startListening({ isAutoStart: true }), 250);
      }
    );
  }, [currentCard?.id, currentCard, hasStarted, partCheckpoint, isCompleted]);

  useEffect(() => {
    if (
      !currentCard ||
      !hasStarted ||
      partCheckpoint ||
      isCompleted ||
      isLoading ||
      isListening ||
      isSpeaking ||
      currentCard.phase === "t2-translate" ||
      pendingInitialTtsCardIdRef.current === currentCard.id ||
      autoSttCardIdsRef.current.has(currentCard.id)
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      startListening({ isAutoStart: true });
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [currentCard?.id, currentCard, hasStarted, partCheckpoint, isCompleted, isLoading, isListening, isSpeaking]);

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
    const completedCard = sourceCards[currentIndex];
    const nextCard = sourceCards[currentIndex + 1];

    if (currentIndex >= cards.length - 1) {
      setPartCheckpoint({
        completedPhase: completedCard?.phase || "t2-translate",
        nextPhase: null,
        nextIndex: null,
      });
      setStatusMessage("Part 3 채점 결과를 확인하세요.");
      return;
    }

    if (completedCard?.phase && nextCard?.phase && completedCard.phase !== nextCard.phase) {
      setPartCheckpoint({
        completedPhase: completedCard.phase,
        nextPhase: nextCard.phase,
        nextIndex: currentIndex + 1,
      });
      setStatusMessage("파트 채점 결과를 확인하세요.");
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
      cards: sourceCards,
    });

    setXpSaveResult(saveResult);
    if (saveResult.ok && typeof saveResult.nextXp === "number") {
      setStudentCoin(saveResult.nextXp);
    }
  };

  const applySpokenText = (spokenText) => {
    const targetText = currentCard.english;
    const nextScore =
      currentCard.phase === "t1"
        ? calculateLetterSimilarity(targetText, spokenText)
        : calculateSimilarity(targetText, spokenText);
    const nextAttempts = currentCard.attempts + 1;
    const autoPassed = nextAttempts >= AUTO_PASS_ATTEMPT_COUNT;
    const passed = nextScore >= PASS_THRESHOLD || autoPassed;
    const acceptedScore = autoPassed && nextScore < PASS_THRESHOLD ? 100 : nextScore;
    const acceptedSpokenText = autoPassed && nextScore < PASS_THRESHOLD ? currentCard.english : spokenText;
    let nextCards = cards;

    setCards((previousCards) => {
      nextCards = previousCards.map((card, index) =>
        index === currentIndex
          ? {
              ...card,
              attempts: nextAttempts,
              bestScore: Math.max(card.bestScore, acceptedScore),
              passed: card.passed || passed,
              lastSpokenText: acceptedSpokenText,
              lastScore: acceptedScore,
            }
          : card
      );
      return nextCards;
    });

    const passMessage =
      currentCard.phase === "t2-repeat"
        ? `예문 통과입니다. ${currentCard.english}`
        : `정답 인정입니다. 일치율 ${nextScore}%`;

    setStatusMessage(
      autoPassed && nextScore < PASS_THRESHOLD
        ? `정답 인정입니다. 일치율 ${acceptedScore}%`
        : passed
        ? passMessage
        : `일치율 ${nextScore}%입니다. 다시 말해 주세요.`
    );

    if (passed) {
      playSuccessSound();
      window.setTimeout(() => moveToNextCard(nextCards), 700);
    }
  };

  const applyCompositionAnswer = () => {
    if (!currentCard || currentCard.phase !== "t2-translate") {
      return;
    }

    const answerText = compositionAnswer.map((word) => word.text).join(" ");

    if (!answerText) {
      setStatusMessage("주어진 단어를 배열해 주세요.");
      return;
    }

    const nextScore = calculateSimilarity(currentCard.english, answerText);
    const nextAttempts = currentCard.attempts + 1;
    const autoPassed = nextAttempts >= AUTO_PASS_ATTEMPT_COUNT;
    const passed = nextScore >= PASS_THRESHOLD || autoPassed;
    const acceptedScore = autoPassed && nextScore < PASS_THRESHOLD ? 100 : nextScore;
    const acceptedAnswerText = autoPassed && nextScore < PASS_THRESHOLD ? currentCard.english : answerText;
    let nextCards = cards;

    setCards((previousCards) => {
      nextCards = previousCards.map((card, index) =>
        index === currentIndex
          ? {
              ...card,
              attempts: nextAttempts,
              bestScore: Math.max(card.bestScore, acceptedScore),
              passed: card.passed || passed,
              lastSpokenText: acceptedAnswerText,
              lastScore: acceptedScore,
              compositionAnswer,
            }
          : card
      );
      return nextCards;
    });

    setStatusMessage(
      autoPassed && nextScore < PASS_THRESHOLD
        ? `정답 인정입니다. 일치율 ${acceptedScore}%`
        : passed
        ? `정답 인정입니다. 일치율 ${nextScore}%`
        : `일치율 ${nextScore}%입니다. 다시 배열해 주세요.`
    );

    if (passed) {
      playSuccessSound();
      window.setTimeout(() => moveToNextCard(nextCards), 700);
    }
  };

  const applySpokenCompositionAnswer = (spokenText) => {
    if (!currentCard || currentCard.phase !== "t2-translate") {
      return;
    }

    const nextCompositionAnswer = getSpokenCompositionAnswer(
      currentCard.wordBank || [],
      spokenText
    );

    if (nextCompositionAnswer.length === 0) {
      setStatusMessage("인식된 단어와 일치하는 단어가 없습니다. 다시 말해 주세요.");
      return;
    }

    setCompositionAnswer(nextCompositionAnswer);
    setCards((previousCards) =>
      previousCards.map((card, index) =>
        index === currentIndex
          ? {
              ...card,
              compositionAnswer: nextCompositionAnswer,
              lastSpokenText: nextCompositionAnswer.map((word) => word.text).join(" "),
            }
          : card
      )
    );
    setStatusMessage("STT 인식 결과에 맞춰 단어를 자동 배치했습니다.");
  };

  const addCompositionWord = (word) => {
    if (!word || compositionAnswer.some((answerWord) => answerWord.id === word.id)) {
      return;
    }

    setCompositionAnswer((answer) => [...answer, word]);
  };

  const removeCompositionWord = (wordIndex) => {
    setCompositionAnswer((answer) => answer.filter((_, index) => index !== wordIndex));
  };

  const moveCompositionWord = (fromIndex, toIndex) => {
    if (fromIndex === null || toIndex === null || fromIndex === toIndex) {
      return;
    }

    setCompositionAnswer((answer) => {
      const nextAnswer = [...answer];
      const [movedWord] = nextAnswer.splice(fromIndex, 1);
      nextAnswer.splice(toIndex, 0, movedWord);
      return nextAnswer;
    });
  };

  const resetCompositionAnswer = () => {
    setCompositionAnswer([]);
    setStatusMessage("단어 배열을 다시 시작합니다.");
  };

  const continueAfterPartCheckpoint = () => {
    if (!partCheckpoint) {
      return;
    }

    if (partCheckpoint.nextIndex === null) {
      setPartCheckpoint(null);
      finishStudy(cards);
      return;
    }

    setCurrentIndex(partCheckpoint.nextIndex);
    setPartCheckpoint(null);
    setStatusMessage("다음 Part를 시작합니다.");
  };

  const startListening = ({ isAutoStart = false } = {}) => {
    if (!currentCard) {
      return;
    }

    if (isAutoStart) {
      if (autoSttCardIdsRef.current.has(currentCard.id)) {
        return;
      }
      autoSttCardIdsRef.current.add(currentCard.id);
    }

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
      setStatusMessage("녹음이 시작되었습니다. 시작하세요.");
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

      if (currentCard.phase === "t2-translate") {
        applySpokenCompositionAnswer(spokenText);
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
    autoTtsCardIdsRef.current = new Set();
    autoSttCardIdsRef.current = new Set();
    pendingInitialTtsCardIdRef.current = "";
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
    setHasStarted(false);
    setPartCheckpoint(null);
    setIsCompleted(false);
    setXpSaveResult(null);
    setStatusMessage("새 학습 세션을 시작합니다.");
  };

  const getCardDisplayText = (card) => {
    if (!card) {
      return "";
    }

    return card.phase === "t2-translate" ? card.korean : card.english;
  };

  const getCardPromptText = (card) => {
    if (!card) {
      return "";
    }

    if (card.phase === "t2-repeat") {
      return "예문을 듣고 그대로 따라 읽어 주세요.";
    }

    if (card.phase === "t2-translate") {
      return "주어진 단어를 배열해 영어 문장을 완성해 주세요.";
    }

    return "영어 문장을 듣고 그대로 따라 읽어 주세요.";
  };

  const availableCompositionWords =
    currentCard?.phase === "t2-translate"
      ? (currentCard.wordBank || []).filter(
          (word) => !compositionAnswer.some((answerWord) => answerWord.id === word.id)
        )
      : [];
  const partResultItems = [
    { ...PART_INFO_BY_PHASE.t1, result: results.parts.part1 },
    { ...PART_INFO_BY_PHASE["t2-repeat"], result: results.parts.part2 },
    { ...PART_INFO_BY_PHASE["t2-translate"], result: results.parts.part3 },
  ];
  const checkpointCompletedPart = partCheckpoint
    ? PART_INFO_BY_PHASE[partCheckpoint.completedPhase]
    : null;
  const checkpointNextPart = partCheckpoint?.nextPhase
    ? PART_INFO_BY_PHASE[partCheckpoint.nextPhase]
    : null;
  const checkpointResult = checkpointCompletedPart
    ? results.parts[checkpointCompletedPart.key]
    : null;

  if (partCheckpoint && checkpointCompletedPart && checkpointResult && !isCompleted) {
    return (
      <main className="flashcard-page">
        <section className="flashcard-shell flashcard-part-break">
          <div className="flashcard-intro-hero">
            <span className="flashcard-intro-kicker">채점 결과</span>
            <h1>{checkpointCompletedPart.title}</h1>
            <p>
              방금 끝낸 Part의 결과입니다. 점수를 확인하고 다음 단계로 넘어가세요.
            </p>
          </div>

          <article className="flashcard-part-result flashcard-part-result-large">
            <h3>{checkpointCompletedPart.title} 채점</h3>
            <div>
              <span>성공 카드</span>
              <strong>{checkpointResult.successCards} / {checkpointResult.totalCards}</strong>
            </div>
            <div>
              <span>실패 카드</span>
              <strong>{checkpointResult.failedCards}</strong>
            </div>
            <div>
              <span>총 시도 횟수</span>
              <strong>{checkpointResult.totalAttempts}</strong>
            </div>
            <div>
              <span>평균 일치율</span>
              <strong>{checkpointResult.averageScore}%</strong>
            </div>
            <div>
              <span>Part 점수</span>
              <strong>{checkpointResult.finalScore}점</strong>
            </div>
          </article>

          {checkpointNextPart ? (
            <article className="flashcard-next-part-card">
              <span className="flashcard-intro-kicker">다음 단계</span>
              <h2>{checkpointNextPart.title}</h2>
              <p>{checkpointNextPart.description}</p>
              <small>{checkpointNextPart.helper}</small>
            </article>
          ) : (
            <article className="flashcard-next-part-card">
              <span className="flashcard-intro-kicker">마지막 단계 완료</span>
              <h2>Part 3 채점이 끝났습니다.</h2>
              <p>이제 전체 결과와 획득 XP를 확인할 수 있습니다.</p>
            </article>
          )}

          <button
            className="flashcard-primary-button flashcard-start-button"
            type="button"
            onClick={continueAfterPartCheckpoint}
          >
            {checkpointNextPart ? `${checkpointNextPart.title} 시작하기` : "최종 결과 보기"}
          </button>
        </section>
      </main>
    );
  }

  if (!hasStarted && !isCompleted) {
    return (
      <main className="flashcard-page">
        <section className="flashcard-shell flashcard-intro">
          <div className="flashcard-intro-hero">
            <span className="flashcard-intro-kicker">SpeakRank</span>
            <h1>시험 안내</h1>
            <p>
              총 <strong>3단계</strong>로 진행됩니다. 각 단계의 설명을 읽고 준비가 되면 시험을 시작하세요.
            </p>
          </div>

          <div className="flashcard-intro-parts">
            <article className="flashcard-intro-card">
              <span className="flashcard-intro-icon" aria-hidden="true">Aa</span>
              <h2>Part 1. Words 단어</h2>
              <p>영어 단어를 보고 뜻을 확인하는 <strong>단어 체크</strong> 단계입니다.</p>
              <small>단어의 의미를 알고 있는지 빠르게 확인합니다.</small>
            </article>

            <article className="flashcard-intro-card">
              <span className="flashcard-intro-icon" aria-hidden="true">▶</span>
              <h2>Part 2. 영어 따라 말하기</h2>
              <p>화면에 나오는 영어 문장을 듣고 그대로 <strong>따라 말하는</strong> 단계입니다.</p>
              <small>TTS가 먼저 문장을 읽어주면, 사용자는 같은 문장을 말합니다. 발음과 일치율을 확인합니다.</small>
            </article>

            <article className="flashcard-intro-card">
              <span className="flashcard-intro-icon" aria-hidden="true">⇄</span>
              <h2>Part 3. 영작하기</h2>
              <p>한글 문장을 보고 <strong>영어 문장</strong>을 만드는 단계입니다.</p>
              <small>단어를 스크램블드 해서 주고 배열하는 학습입니다.</small>
            </article>
          </div>

          <div className="flashcard-intro-note">
            <p>각 문제는 음성으로 답변합니다.</p>
            <p>완벽하지 않아도 괜찮습니다. <strong>60% 이상</strong> 비슷하면 정답으로 인정됩니다.</p>
            <p>시험이 끝나면 <strong>총 시도 횟수</strong>, <strong>평균 일치율</strong>, <strong>최종 점수</strong>, <strong>획득 XP</strong>를 보여줍니다.</p>
          </div>

          <button
            className="flashcard-primary-button flashcard-start-button"
            type="button"
            onClick={() => {
              setHasStarted(true);
              setStatusMessage("시험을 시작합니다.");
            }}
            disabled={isLoading || cards.length === 0}
          >
            시험 시작하기
          </button>
        </section>
      </main>
    );
  }

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

          <div className="flashcard-part-results">
            {partResultItems.map((item) => (
              <article className="flashcard-part-result" key={item.key}>
                <h3>{item.title}</h3>
                <div>
                  <span>카드</span>
                  <strong>{item.result.successCards} / {item.result.totalCards}</strong>
                </div>
                <div>
                  <span>실패</span>
                  <strong>{item.result.failedCards}</strong>
                </div>
                <div>
                  <span>시도</span>
                  <strong>{item.result.totalAttempts}</strong>
                </div>
                <div>
                  <span>평균</span>
                  <strong>{item.result.averageScore}%</strong>
                </div>
                <div>
                  <span>점수</span>
                  <strong>{item.result.finalScore}점</strong>
                </div>
              </article>
            ))}
          </div>

          <div className={`flashcard-xp-status ${xpSaveResult?.ok ? "success" : "saving"}`}>
            {xpSaveResult?.ok ? (
              "XP 업데이트 성공"
            ) : (
              <>
                <span>저장 중입니다. 화면을 끄지 마세요.</span>
                <div className="flashcard-save-progress" aria-hidden="true">
                  <span />
                </div>
              </>
            )}
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
          <span className="flashcard-user-status">
            <span>{studentName} · {className}</span>
            <span className="flashcard-coin" aria-label={`보유 코인 ${studentCoin}`}>
              <span aria-hidden="true">●</span>
              {studentCoin}
            </span>
          </span>
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
              <span className="flashcard-type">{currentCard.phaseLabel}</span>
              <p className="flashcard-main-text">
                {getCardDisplayText(currentCard)}
              </p>
              {currentCard.pronunciationGuide && (
                <p className="flashcard-guide-text">{currentCard.pronunciationGuide}</p>
              )}
              <p className="flashcard-sub-text">{getCardPromptText(currentCard)}</p>
            </>
          ) : (
            <p className="flashcard-main-text">학습할 카드가 없습니다.</p>
          )}
        </div>

        {currentCard?.phase === "t2-translate" && (
          <div className="flashcard-compose">
            <div
              className="flashcard-answer-zone"
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggedBankWord) {
                  addCompositionWord(draggedBankWord);
                  setDraggedBankWord(null);
                }
              }}
            >
              {compositionAnswer.length > 0 ? (
                compositionAnswer.map((word, index) => (
                  <button
                    className="flashcard-answer-chip"
                    type="button"
                    key={word.id}
                    draggable
                    onClick={() => removeCompositionWord(index)}
                    onDragStart={() => setDraggedAnswerIndex(index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      moveCompositionWord(draggedAnswerIndex, index);
                      setDraggedAnswerIndex(null);
                    }}
                  >
                    {word.text}
                  </button>
                ))
              ) : (
                <span>단어를 여기로 옮겨 문장을 만드세요.</span>
              )}
            </div>

            <div className="flashcard-word-bank">
              {availableCompositionWords.map((word) => (
                <button
                  className="flashcard-word-chip"
                  type="button"
                  key={word.id}
                  draggable
                  onClick={() => addCompositionWord(word)}
                  onDragStart={() => setDraggedBankWord(word)}
                >
                  {word.text}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flashcard-actions">
          {currentCard?.phase === "t2-translate" ? (
            <>
              <button
                className="flashcard-secondary-button"
                type="button"
                onClick={startListening}
                disabled={!currentCard || isListening || isSpeaking}
              >
                {isListening ? "듣는 중" : currentCard?.lastSpokenText ? "다시 말하기" : "말하기 시작"}
              </button>
              <button
                className="flashcard-primary-button"
                type="button"
                onClick={applyCompositionAnswer}
                disabled={!currentCard}
              >
                정답 확인
              </button>
              <button
                className="flashcard-secondary-button"
                type="button"
                onClick={resetCompositionAnswer}
                disabled={!currentCard || compositionAnswer.length === 0}
              >
                다시 배열
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
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
            {currentCard.phase === "t1" ? (
              <>
                <p><span>원문 문장</span>{currentCard.english}</p>
                {currentCard.pronunciationGuide && (
                  <p><span>발음 가이드</span>{currentCard.pronunciationGuide}</p>
                )}
                <p><span>사용자가 말한 문장</span>{currentCard.lastSpokenText || "-"}</p>
                <p><span>일치율</span>{currentCard.lastScore ?? "-"}{currentCard.lastScore !== null ? "%" : ""}</p>
                <p><span>정답 인정 여부</span>{currentCard.passed ? "통과" : "미통과"}</p>
              </>
            ) : currentCard.phase === "t2-repeat" ? (
              <>
                <p><span>예문</span>{currentCard.english}</p>
                {currentCard.pronunciationGuide && (
                  <p><span>발음 가이드</span>{currentCard.pronunciationGuide}</p>
                )}
                <p><span>사용자가 말한 문장</span>{currentCard.lastSpokenText || "-"}</p>
                <p><span>일치율</span>{currentCard.lastScore ?? "-"}{currentCard.lastScore !== null ? "%" : ""}</p>
                <p><span>정답 인정 여부</span>{currentCard.passed ? "예문 통과" : "미통과"}</p>
              </>
            ) : (
              <>
                <p><span>한글 문장</span>{currentCard.korean}</p>
                <p><span>정답 영어 문장</span>{getT2TranslateAnswerDisplay(currentCard)}</p>
                {currentCard.pronunciationGuide && (
                  <p><span>발음 가이드</span>{currentCard.pronunciationGuide}</p>
                )}
                <p><span>사용자가 만든 영어 문장</span>{currentCard.lastSpokenText || "-"}</p>
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
