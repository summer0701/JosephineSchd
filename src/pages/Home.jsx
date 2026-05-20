import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const LOGIN_USER_KEY = "josephineLoginUser";
const LOGIN_CLASS_KEY = "josephineLoginClass";
const SENTENCE_SHEET_ID = "1_JXlTJ-iBaKrxRrGJLf9-KUljk_xiGID3K8uZ2sjcEo";
const PASS_SCORE = 60;

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

const normalizeWords = (text) =>
  text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const getSimilarityScore = (targetText, spokenText) => {
  const targetWords = normalizeWords(targetText);
  const spokenWords = normalizeWords(spokenText);

  if (targetWords.length === 0 || spokenWords.length === 0) {
    return 0;
  }

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

  return Math.round((table[targetWords.length][spokenWords.length] / targetWords.length) * 100);
};

const getSpeechRecognition = () => {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
};

const playTone = (frequency, duration, type = "sine") => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;

  if (!AudioContext) {
    return;
  }

  const audioContext = new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  gain.gain.setValueAtTime(0.001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);

  oscillator.onended = () => {
    audioContext.close();
  };
};

const playStartSound = () => {
  playTone(660, 0.12, "sine");
};

const playSuccessSound = () => {
  playTone(784, 0.12, "sine");
  window.setTimeout(() => playTone(1046, 0.16, "sine"), 120);
};

const getRecognitionErrorMessage = (errorCode) => {
  const messages = {
    "no-speech": "말소리가 감지되지 않았습니다. 마이크 가까이에서 조금 더 크게 말해주세요.",
    "audio-capture": "마이크를 찾을 수 없습니다. 컴퓨터의 마이크 연결을 확인해주세요.",
    "not-allowed": "마이크 권한이 차단되었습니다. 주소창 왼쪽의 권한에서 마이크를 허용해주세요.",
    "service-not-allowed": "브라우저가 음성 인식 서비스를 차단했습니다. Chrome에서 다시 시도해주세요.",
    network: "음성 인식 서버에 연결하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해주세요.",
    aborted: "녹음이 중지되었습니다.",
  };

  return messages[errorCode] || `음성을 인식하지 못했습니다. 오류: ${errorCode || "알 수 없음"}`;
};

function Home() {
  const navigate = useNavigate();
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const mediaStreamRef = useRef(null);
  const audioUrlRef = useRef("");
  const finalTranscriptRef = useRef("");
  const latestTranscriptRef = useRef("");
  const recognitionErrorRef = useRef("");
  const [userName, setUserName] = useState("");
  const [className, setClassName] = useState("");
  const [sentences, setSentences] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [studentText, setStudentText] = useState("");
  const [statusMessage, setStatusMessage] = useState("마이크 버튼을 눌러 문장을 말해보세요.");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState("");
  const [score, setScore] = useState(null);
  const [scores, setScores] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentSentence = useMemo(() => {
    return sentences[currentIndex] || "";
  }, [sentences, currentIndex]);

  useEffect(() => {
    const savedUserName = localStorage.getItem(LOGIN_USER_KEY);
    const savedClassName = localStorage.getItem(LOGIN_CLASS_KEY);

    if (!savedUserName) {
      navigate("/");
      return;
    }

    setUserName(savedUserName);
    setClassName(savedClassName || "class1");
  }, [navigate]);

  useEffect(() => {
    if (!className) {
      return;
    }

    const fetchSentences = async () => {
      setIsLoading(true);

      try {
        const url = `https://docs.google.com/spreadsheets/d/${SENTENCE_SHEET_ID}/gviz/tq?tqx=out:csv&gid=0`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("문장을 불러오지 못했습니다.");
        }

        const rows = parseCsv(await response.text());
        const loadedSentences = rows
          .filter((row) => (row[0] || "").trim() === className)
          .map((row) => (row[1] || "").trim())
          .filter(Boolean);

        setSentences(loadedSentences);
        setCurrentIndex(0);
        setStudentText("");
        setScore(null);
        setScores([]);
        setIsCompleted(false);
        setStatusMessage(
          loadedSentences.length > 0
            ? "마이크 버튼을 눌러 첫 문장을 말해보세요."
            : `${className} 문장이 없습니다.`
        );
      } catch (error) {
        console.error("문장 로딩 오류:", error);
        setStatusMessage("문장을 불러오지 못했습니다. 시트 공개 설정을 확인해주세요.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSentences();
  }, [className]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  const finishRecognition = (spokenText) => {
    const nextScore = getSimilarityScore(currentSentence, spokenText);
    const passed = nextScore >= PASS_SCORE;
    const nextScores = [...scores];

    nextScores[currentIndex] = nextScore;

    setScore(nextScore);
    setScores(nextScores);
    setStudentText(passed ? currentSentence : spokenText);
    if (passed) {
      playSuccessSound();
    }
    if (currentIndex === sentences.length - 1) {
      setIsCompleted(true);
    }
    setStatusMessage(
      currentIndex === sentences.length - 1
        ? "모든 문장을 완료했습니다."
        : passed
        ? `통과입니다. ${nextScore}% 일치해서 정답으로 처리했어요.`
        : `다시 연습해보세요. ${nextScore}% 일치했습니다.`
    );
  };

  const startAudioRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setStatusMessage("이 브라우저는 녹음 재생 기능을 지원하지 않습니다. Chrome에서 실행해주세요.");
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }

      audioChunksRef.current = [];
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = mediaRecorder;
      setAudioUrl("");

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        const nextAudioUrl = URL.createObjectURL(audioBlob);

        audioUrlRef.current = nextAudioUrl;
        setAudioUrl(nextAudioUrl);

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
      };

      mediaRecorder.start();
      return true;
    } catch (error) {
      console.error("녹음 시작 오류:", error);
      setStatusMessage("마이크 녹음을 시작하지 못했습니다. 마이크 권한을 허용해주세요.");
      return false;
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const startListening = async () => {
    if (!currentSentence || isListening) {
      return;
    }

    const SpeechRecognition = getSpeechRecognition();

    if (!SpeechRecognition) {
      setStatusMessage("이 브라우저는 음성 인식을 지원하지 않습니다. Chrome에서 실행해주세요.");
      return;
    }

    const canRecordAudio = await startAudioRecording();

    if (!canRecordAudio) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      finalTranscriptRef.current = "";
      latestTranscriptRef.current = "";
      recognitionErrorRef.current = "";
      setIsListening(true);
      setStudentText("");
      setScore(null);
      setStatusMessage("듣는 중입니다. 정답 문장을 영어로 말해주세요.");
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript || "";

        if (event.results[i].isFinal) {
          finalTranscriptRef.current = `${finalTranscriptRef.current} ${transcript}`.trim();
        } else {
          interimTranscript = `${interimTranscript} ${transcript}`.trim();
        }
      }

      const visibleTranscript = finalTranscriptRef.current || interimTranscript;

      if (visibleTranscript) {
        latestTranscriptRef.current = visibleTranscript;
        setStudentText(visibleTranscript);
      }
    };

    recognition.onerror = (event) => {
      recognitionErrorRef.current = event.error;
      setStatusMessage(getRecognitionErrorMessage(event.error));
      console.error("STT 오류:", event.error, event.message);
    };

    recognition.onend = () => {
      setIsListening(false);
      stopAudioRecording();

      if (recognitionErrorRef.current) {
        return;
      }

      const spokenText = (finalTranscriptRef.current || latestTranscriptRef.current).trim();

      if (!spokenText) {
        setStatusMessage("인식된 문장이 없습니다. 마이크 권한과 입력 장치를 확인해주세요.");
        return;
      }

      finishRecognition(spokenText);
    };

    recognitionRef.current = recognition;

    try {
      playStartSound();
      recognition.start();
    } catch (error) {
      console.error("STT 시작 오류:", error);
      setStatusMessage("녹음을 시작하지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해주세요.");
      stopAudioRecording();
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    stopAudioRecording();
    setIsListening(false);
  };

  const goToNextSentence = () => {
    setCurrentIndex((index) => Math.min(index + 1, sentences.length - 1));
    setStudentText("");
    setScore(null);
    setIsCompleted(false);
    setAudioUrl("");
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = "";
    }
    setStatusMessage("마이크 버튼을 눌러 다음 문장을 말해보세요.");
  };

  const isLastSentence = currentIndex >= sentences.length - 1;
  const completedScores = sentences.map((sentence, index) => ({
    sentence,
    score: scores[index] ?? 0,
  }));
  const averageScore =
    completedScores.length > 0
      ? Math.round(
          completedScores.reduce((total, item) => total + item.score, 0) / completedScores.length
        )
      : 0;

  if (isCompleted) {
    return (
      <main className="stt-page">
        <header className="stt-topbar">
          <div className="stt-brand">
            <div className="stt-logo" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <strong>My English Test</strong>
            <span className="stt-badge">STT</span>
          </div>

          <div className="stt-user">
            <div className="stt-avatar" aria-hidden="true">{userName.slice(0, 1)}</div>
            <strong>{userName}</strong>
            <span>{className}</span>
          </div>
        </header>

        <section className="stt-card stt-result-card" aria-label="STT 결과">
          <div className="stt-result-hero">
            <p>축하합니다.</p>
            <h1>모든 문장을 완료했습니다!</h1>
            <strong>평균 발음 {averageScore}%</strong>
          </div>

          <div className="stt-result-list">
            {completedScores.map((item, index) => (
              <div className="stt-result-item" key={`${item.sentence}-${index}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{item.sentence}</p>
                <strong>{item.score}%</strong>
              </div>
            ))}
          </div>

          <button
            className="stt-save-button stt-retry-button"
            type="button"
            onClick={() => {
              setCurrentIndex(0);
              setStudentText("");
              setScore(null);
              setScores([]);
              setAudioUrl("");
              setIsCompleted(false);
              setStatusMessage("마이크 버튼을 눌러 첫 문장을 말해보세요.");
              if (audioUrlRef.current) {
                URL.revokeObjectURL(audioUrlRef.current);
                audioUrlRef.current = "";
              }
            }}
          >
            다시 시작
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="stt-page">
      <header className="stt-topbar">
        <div className="stt-brand">
          <div className="stt-logo" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <strong>My English Test</strong>
          <span className="stt-badge">STT</span>
        </div>

        <div className="stt-user">
          <div className="stt-avatar" aria-hidden="true">{userName.slice(0, 1)}</div>
          <strong>{userName}</strong>
          <span>{className}</span>
        </div>
      </header>

      <section className="stt-card" aria-label="실시간 STT">
        <div className="stt-heading">
          <h1>실시간 STT</h1>
          <p>영어 발화를 실시간으로 텍스트로 변환하고 정답과 비교합니다.</p>
        </div>

        <div className={`stt-listener ${isListening ? "active" : ""}`}>
          <div className="stt-wave" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <button
            className="stt-mic-button"
            type="button"
            onClick={isListening ? stopListening : startListening}
            disabled={isLoading || !currentSentence}
            aria-label={isListening ? "녹음 중지" : "녹음 시작"}
          >
            <span aria-hidden="true"></span>
          </button>
          <div className="stt-status">
            <strong>{isListening ? "듣는 중" : "대기 중"}</strong>
            <p>{statusMessage}</p>
          </div>
        </div>

        <div className="stt-practice">
          <div className="stt-row stt-target">
            <span>정답</span>
            <p>{isLoading ? "문장을 불러오는 중입니다." : currentSentence}</p>
          </div>
          <div className="stt-row">
            <span>학생이 말한곳</span>
            <p>{studentText || "아직 인식된 문장이 없습니다."}</p>
          </div>
        </div>

        <div className="stt-actions">
          <button
            className="stt-record-button"
            type="button"
            onClick={isListening ? stopListening : startListening}
            disabled={isLoading || !currentSentence}
          >
            <span aria-hidden="true"></span>
            {isListening ? "녹음 중지" : "녹음 시작"}
          </button>

          <button
            className="stt-save-button"
            type="button"
            onClick={goToNextSentence}
            disabled={isLastSentence || sentences.length === 0}
          >
            다음 문장
          </button>
        </div>

        {audioUrl && (
          <div className="stt-playback">
            <span>내 녹음 듣기</span>
            <audio controls src={audioUrl}>
              녹음 파일을 재생할 수 없습니다.
            </audio>
          </div>
        )}

        <div className="stt-progress">
          <span>
            {sentences.length > 0 ? `${currentIndex + 1} / ${sentences.length}` : "0 / 0"}
          </span>
          {score !== null && <strong>{score}%</strong>}
        </div>
      </section>

      <p className="stt-footnote">음성 데이터는 브라우저에서 처리되며, 학습 목적으로만 사용됩니다.</p>
    </main>
  );
}

export default Home;
