import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function DemoLecture() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    lectureName: "",
    preferredDate: "",
    preferredTime: "",
    message: "",
  });

  const [lectures, setLectures] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Google Sheets에서 강의 목록 가져오기
  useEffect(() => {
    const fetchLectures = async () => {
      try {
        const sheetId = "1yjHT2YkaiJmB78mdouPPGSZDmEXCIdReZUtrzhO32Ww";
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq`;

        const response = await fetch(url);
        const text = await response.text();

        // Google Visualization API 응답 파싱
        const jsonStr = text.match(/\(({.*})\)/)[1];
        const data = JSON.parse(jsonStr);

        if (data.table && data.table.rows) {
          const lectureList = data.table.rows
            .slice(1) // 헤더 제외
            .map((row) => row.c[0]?.v || "")
            .filter((lecture) => lecture); // 빈 값 제외

          setLectures(lectureList);
        }
      } catch (error) {
        console.error("강의 목록 로드 오류:", error);
      }
    };

    fetchLectures();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Google Apps Script로 데이터 전송
    const scriptUrl =
      "https://script.google.com/macros/s/AKfycbxkpKjQDzJlq37QPwagm_lowRo_itoBMOuFi62O6CBdOyS5bt_ijkOtwlgobppIkm2bhg/exec";

    fetch(scriptUrl, {
      method: "POST",
      body: JSON.stringify(formData),
    })
      .then((response) => {
        alert("신청이 완료되었습니다!\n담당자가 곧 연락드리겠습니다.");
        setFormData({
          name: "",
          email: "",
          phone: "",
          lectureName: "",
          preferredDate: "",
          preferredTime: "",
          message: "",
        });
        setIsLoading(false);
        // 홈으로 이동
        navigate("/");
      })
      .catch((error) => {
        console.error("오류:", error);
        alert("신청 중 오류가 발생했습니다. 다시 시도해주세요.");
        setIsLoading(false);
      });
  };

  return (
    <main className="main-content demo-page">
      <div className="page-header">
        <h2>🎤 데모강의 신청</h2>
        <p>아래 양식을 작성하여 데모강의를 신청해주세요.</p>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit} className="demo-form">
          <div className="form-group">
            <label htmlFor="name">이름 *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="이름을 입력하세요"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">이메일 *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="이메일을 입력하세요"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">연락처 *</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="010-0000-0000"
            />
          </div>

          <div className="form-group">
            <label htmlFor="lectureName">강의 선택 *</label>
            <select
              id="lectureName"
              name="lectureName"
              value={formData.lectureName}
              onChange={handleChange}
              required
            >
              <option value="">강의를 선택하세요</option>
              {lectures.map((lecture, index) => (
                <option key={index} value={lecture}>
                  {lecture}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="preferredDate">신청 희망날짜 *</label>
            <input
              type="date"
              id="preferredDate"
              name="preferredDate"
              value={formData.preferredDate}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="preferredTime">신청 희망시간 *</label>
            <select
              id="preferredTime"
              name="preferredTime"
              value={formData.preferredTime}
              onChange={handleChange}
              required
            >
              <option value="">시간을 선택하세요</option>
              <option value="10:00">10:00</option>
              <option value="11:00">11:00</option>
              <option value="14:00">14:00</option>
              <option value="15:00">15:00</option>
              <option value="16:00">16:00</option>
              <option value="18:00">18:00</option>
              <option value="19:00">19:00</option>
              <option value="20:00">20:00</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="message">추가 메시지</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="궁금한 점이나 원하는 레벨을 입력하세요"
              rows="5"
            />
          </div>

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? "잠시만 기다려 주세요" : "신청하기"}
          </button>
        </form>
      </div>

      <footer className="footer">
        <p>✨ 매 순간을 소중히 ✨</p>
      </footer>
    </main>
  );
}

export default DemoLecture;
