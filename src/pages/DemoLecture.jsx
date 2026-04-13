import React, { useState } from "react";

function DemoLecture() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    preferredDate: "",
    preferredTime: "",
    message: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("신청이 완료되었습니다!\n담당자가 곧 연락드리겠습니다.");
    setFormData({
      name: "",
      email: "",
      phone: "",
      preferredDate: "",
      preferredTime: "",
      message: "",
    });
  };

  return (
    <main className="main-content">
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

          <button type="submit" className="submit-btn">
            신청하기
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
