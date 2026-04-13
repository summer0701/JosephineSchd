import React, { useState } from "react";

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
  const categories = ["전체", "문법", "회화", "발음", "어휘", "리딩", "라이팅"];

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
