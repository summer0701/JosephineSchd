import React, { useEffect, useRef, useState } from "react";
import {
  AUDIO_ACTIONS,
  buildMaterialSpeechText,
  canStartAudioAction,
  getRecordingButtonLabel,
} from "../utils/materialAudio";

function Materials() {
  const [materials] = useState([
    {
      id: 1,
      title: "기초 영문법 정리",
      description: "초급자를 위한 기본 영문법 자료",
      category: "문법",
      date: "2024-04-10",
      type: "PDF",
    },
    {
      id: 2,
      title: "daily conversation 패턴",
      description: "일상 회화에서 자주 쓰는 표현들",
      category: "회화",
      date: "2024-04-08",
      type: "PDF",
    },
    {
      id: 3,
      title: "발음 가이드",
      description: "정확한 발음을 위한 음성 가이드",
      category: "발음",
      date: "2024-04-05",
      type: "Audio",
    },
    {
      id: 4,
      title: "영어 단어 1000개",
      description: "일상생활에서 자주 사용하는 단어 모음",
      category: "어휘",
      date: "2024-04-01",
      type: "PDF",
    },
    {
      id: 5,
      title: "리딩 연습 자료",
      description: "초급~중급 영어 읽기 자료",
      category: "리딩",
      date: "2024-03-28",
      type: "PDF",
    },
    {
      id: 6,
      title: "라이팅 연습",
      description: "이메일, 편지 작성법 배우기",
      category: "라이팅",
      date: "2024-03-25",
      type: "Document",
    },
  ]);

  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [recordings, setRecordings] = useState({});
  const [activeAudio, setActiveAudio] = useState({
    action: AUDIO_ACTIONS.IDLE,
    materialId: null,
  });
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const audioRef = useRef(null);
  const streamRef = useRef(null);
  const recordingsRef = useRef({});

  const categories = ["전체", "문법", "회화", "발음", "어휘", "리딩", "라이팅"];
  const isAudioBusy = !canStartAudioAction(activeAudio.action);

  const filteredMaterials =
    selectedCategory === "전체"
      ? materials
      : materials.filter((m) => m.category === selectedCategory);

  const getTypeIcon = (type) => {
    switch (type) {
      case "PDF":
        return "📄";
      case "Audio":
        return "🎵";
      case "Document":
        return "📝";
      default:
        return "📎";
    }
  };

  const resetActiveAudio = () => {
    setActiveAudio({ action: AUDIO_ACTIONS.IDLE, materialId: null });
  };

  const stopTts = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  const stopRecordingStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const stopRecordedPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  };

  const stopCurrentAudio = () => {
    stopTts();
    stopRecordedPlayback();

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      resetActiveAudio();
    }
  };

  const handleRecordClick = async (materialId) => {
    const isCurrentRecording =
      activeAudio.action === AUDIO_ACTIONS.RECORDING &&
      activeAudio.materialId === materialId;

    if (isCurrentRecording) {
      stopCurrentAudio();
      return;
    }

    if (isAudioBusy) {
      alert("TTS 듣기, 녹음, 녹음 듣기는 동시에 사용할 수 없습니다.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      alert("이 브라우저에서는 목소리 녹음을 지원하지 않습니다.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      recordedChunksRef.current = [];
      streamRef.current = stream;
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(recordedChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });

        setRecordings((prev) => {
          if (prev[materialId]) {
            URL.revokeObjectURL(prev[materialId]);
          }

          const nextRecordings = {
            ...prev,
            [materialId]: URL.createObjectURL(audioBlob),
          };

          recordingsRef.current = nextRecordings;
          return nextRecordings;
        });

        stopRecordingStream();
        resetActiveAudio();
      };

      mediaRecorder.start();
      setActiveAudio({ action: AUDIO_ACTIONS.RECORDING, materialId });
    } catch (error) {
      stopRecordingStream();
      resetActiveAudio();
      alert("마이크 권한을 확인한 뒤 다시 시도해주세요.");
    }
  };

  const handleRecordingPlayback = (materialId) => {
    if (isAudioBusy) {
      alert("TTS 듣기, 녹음, 녹음 듣기는 동시에 사용할 수 없습니다.");
      return;
    }

    const recordingUrl = recordings[materialId];

    if (!recordingUrl) {
      return;
    }

    const audio = new Audio(recordingUrl);
    audioRef.current = audio;
    setActiveAudio({ action: AUDIO_ACTIONS.PLAYBACK, materialId });

    audio.onended = resetActiveAudio;
    audio.onerror = resetActiveAudio;
    audio.play().catch(() => {
      resetActiveAudio();
      alert("녹음 파일을 재생할 수 없습니다.");
    });
  };

  const handleTtsClick = (material) => {
    if (isAudioBusy) {
      alert("TTS 듣기, 녹음, 녹음 듣기는 동시에 사용할 수 없습니다.");
      return;
    }

    if (!("speechSynthesis" in window) || !window.SpeechSynthesisUtterance) {
      alert("이 브라우저에서는 TTS 듣기를 지원하지 않습니다.");
      return;
    }

    const speechText = buildMaterialSpeechText(material);

    if (!speechText) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = "ko-KR";
    utterance.onend = resetActiveAudio;
    utterance.onerror = resetActiveAudio;

    setActiveAudio({ action: AUDIO_ACTIONS.TTS, materialId: material.id });
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      stopTts();
      stopRecordedPlayback();
      stopRecordingStream();
      Object.values(recordingsRef.current).forEach((url) =>
        URL.revokeObjectURL(url)
      );
    };
  }, []);

  return (
    <main className="main-content">
      <div className="page-header">
        <h2>📚 자료실</h2>
        <p>강의 학습에 도움이 될 다양한 자료들을 다운로드하세요.</p>
      </div>

      <div className="materials-container">
        <div className="category-filter">
          {categories.map((category) => (
            <button
              key={category}
              className={`category-btn ${
                selectedCategory === category ? "active" : ""
              }`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="materials-grid">
          {filteredMaterials.length > 0 ? (
            filteredMaterials.map((material) => (
              <div key={material.id} className="material-card">
                <div className="material-header">
                  <span className="material-type">
                    {getTypeIcon(material.type)} {material.type}
                  </span>
                  <span className="material-category">{material.category}</span>
                </div>
                <h3>{material.title}</h3>
                <p>{material.description}</p>
                <div className="material-audio-controls">
                  <button
                    type="button"
                    className={`audio-btn record-btn ${
                      activeAudio.action === AUDIO_ACTIONS.RECORDING &&
                      activeAudio.materialId === material.id
                        ? "active"
                        : ""
                    }`}
                    onClick={() => handleRecordClick(material.id)}
                    disabled={
                      isAudioBusy &&
                      !(
                        activeAudio.action === AUDIO_ACTIONS.RECORDING &&
                        activeAudio.materialId === material.id
                      )
                    }
                  >
                    {getRecordingButtonLabel(
                      activeAudio.action === AUDIO_ACTIONS.RECORDING &&
                        activeAudio.materialId === material.id
                    )}
                  </button>
                  <button
                    type="button"
                    className="audio-btn playback-btn"
                    onClick={() => handleRecordingPlayback(material.id)}
                    disabled={!recordings[material.id] || isAudioBusy}
                  >
                    ▶️ 녹음 듣기
                  </button>
                  <button
                    type="button"
                    className="audio-btn tts-btn"
                    onClick={() => handleTtsClick(material)}
                    disabled={isAudioBusy}
                  >
                    🔊 TTS 듣기
                  </button>
                </div>
                <div className="material-footer">
                  <span className="material-date">
                    📅 {new Date(material.date).toLocaleDateString("ko-KR")}
                  </span>
                  <button className="download-btn">📥 다운로드</button>
                </div>
              </div>
            ))
          ) : (
            <div className="no-materials">
              <p>해당 카테고리의 자료가 없습니다.</p>
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

export default Materials;
