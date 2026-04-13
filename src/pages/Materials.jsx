import React, { useState, useEffect } from "react";

function Materials() {
  const [materials, setMaterials] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tooltip, setTooltip] = useState({ visible: false, text: "", x: 0, y: 0 });
  const [selectedWord, setSelectedWord] = useState("");

  // Google Sheets에서 자료 데이터 가져오기
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const sheetId = "1HJHLU3-61_eYIQaY9PMMXamt-WGYkDSDOtUJpGag5Ow";
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq`;

        const response = await fetch(url);
        const text = await response.text();

        // Google Visualization API 응답 파싱
        const jsonStr = text.match(/\(({.*})\)/)[1];
        const data = JSON.parse(jsonStr);

        if (data.table && data.table.rows) {
          const materialList = data.table.rows
            .slice(1) // 헤더 제외
            .map((row) => {
              const title = row.c[0]?.v || "";
              const description = row.c[1]?.v || "";
              const link = row.c[2]?.v || "";

              // YouTube URL 판별
              let videoId = "";
              let isArticle = false;

              if (link.includes("youtube.com/shorts/")) {
                videoId = link.split("youtube.com/shorts/")[1];
              } else if (link.includes("youtu.be/")) {
                videoId = link.split("youtu.be/")[1];
              } else if (link.includes("youtube.com/watch?v=")) {
                videoId = link.split("youtube.com/watch?v=")[1];
              } else if (description.includes("기사") || !link.startsWith("http")) {
                // 기사 타입 판별
                isArticle = true;
              }

              return {
                title: title.replace(/\n/g, " "),
                description: description.replace(/\n/g, " "),
                link,
                videoId,
                isArticle,
                type: videoId ? "video" : "article",
              };
            })
            .filter((item) => item.videoId || item.isArticle); // 유효한 아이템만 필터링

          setMaterials(materialList);
        }
      } catch (error) {
        console.error("자료 데이터 로드 오류:", error);
      }
    };

    fetchMaterials();
  }, []);

  // 단어 번역 함수 (MyMemory API 사용 - 무료)
  const translateWord = async (word) => {
    try {
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|ko`
      );
      const data = await response.json();
      return data.responseData.translatedText;
    } catch (error) {
      console.error("번역 오류:", error);
      return "번역 불가";
    }
  };

  // 단어 클릭 이벤트 핸들러
  const handleWordClick = async (e, word) => {
    if (!/^[a-zA-Z]+$/.test(word)) return; // 영어 단어만 처리

    const translation = await translateWord(word);

    const rect = e.target.getBoundingClientRect();
    setTooltip({
      visible: true,
      text: translation,
      x: rect.left,
      y: rect.top - 40,
    });
    setSelectedWord(word);

    // 3초 후 툴팁 사라짐
    setTimeout(() => {
      setTooltip({ ...tooltip, visible: false });
    }, 3000);
  };

  // 텍스트를 단어 단위로 분할하여 클릭 가능하게 만들기
  const renderClickableText = (text) => {
    const words = text.split(/(\s+)/);
    return words.map((word, idx) => {
      if (word.match(/^\s+$/)) {
        return <span key={idx}>{word}</span>;
      }

      // 구두점 제거
      const cleanWord = word.replace(/[.,!?;:"'-]/g, "");
      const punctuation = word.slice(cleanWord.length);

      return (
        <span
          key={idx}
          onClick={(e) => handleWordClick(e, cleanWord)}
          className="clickable-word"
          style={{ cursor: "pointer", color: "#667eea", fontWeight: 500 }}
        >
          {cleanWord}
          {punctuation}
        </span>
      );
    });
  };

  const handlePrev = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? materials.length - 1 : prevIndex - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === materials.length - 1 ? 0 : prevIndex + 1
    );
  };

  const currentMaterial = materials[currentIndex];

  return (
    <main className="main-content">
      <div className="page-header">
        <h2>📚 자료실</h2>
        <p>강의 영상과 기사를 통해 영어를 배워보세요. 단어를 클릭하면 뜻이 나옵니다!</p>
      </div>

      {materials.length > 0 ? (
        <div className="carousel-container">
          {/* 툴팁 */}
          {tooltip.visible && (
            <div
              className="tooltip"
              style={{
                position: "fixed",
                left: `${tooltip.x}px`,
                top: `${tooltip.y}px`,
                zIndex: 1000,
              }}
            >
              <strong>{selectedWord}</strong>: {tooltip.text}
            </div>
          )}

          <div className="carousel-wrapper">
            <button className="carousel-btn prev-btn" onClick={handlePrev}>
              ❮
            </button>

            <div className="carousel-content">
              {/* 영상 타입 */}
              {currentMaterial.type === "video" && (
                <>
                  <div className="video-wrapper">
                    <iframe
                      width="100%"
                      height="400"
                      src={`https://www.youtube.com/embed/${currentMaterial.videoId}`}
                      title={currentMaterial.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    ></iframe>
                  </div>

                  <div className="video-info">
                    <h3>{currentMaterial.title}</h3>
                    <p>{currentMaterial.description}</p>
                  </div>
                </>
              )}

              {/* 기사 타입 */}
              {currentMaterial.type === "article" && (
                <div className="article-container">
                  <h3 className="article-title">{currentMaterial.title}</h3>
                  <div className="article-content">
                    {renderClickableText(currentMaterial.description)}
                  </div>
                  <p className="article-hint">💡 단어를 클릭하면 뜻이 나옵니다!</p>
                </div>
              )}

              <div className="carousel-indicators">
                {materials.map((_, index) => (
                  <button
                    key={index}
                    className={`indicator ${index === currentIndex ? "active" : ""}`}
                    onClick={() => setCurrentIndex(index)}
                  ></button>
                ))}
              </div>
            </div>

            <button className="carousel-btn next-btn" onClick={handleNext}>
              ❯
            </button>
          </div>

          <div className="carousel-counter">
            {currentIndex + 1} / {materials.length}
          </div>
        </div>
      ) : (
        <div className="loading">로딩 중...</div>
      )}

      <footer className="footer">
        <p>✨ 매 순간을 소중히 ✨</p>
      </footer>
    </main>
  );
}

export default Materials;
