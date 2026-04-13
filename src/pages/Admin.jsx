import React, { useState } from "react";

function Admin() {
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState("");

  const ADMIN_PASSWORD = "joseph1234";

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsLoggedIn(true);
      setError("");
      setPassword("");
    } else {
      setError("비밀번호가 올바르지 않습니다.");
      setPassword("");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setPassword("");
  };

  if (!isLoggedIn) {
    return (
      <main className="main-content">
        <div className="page-header">
          <h2>🔐 관리자 페이지</h2>
          <p>관리자 비밀번호를 입력하세요.</p>
        </div>

        <div className="admin-login">
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="password">비밀번호</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                autoFocus
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="submit-btn">
              로그인
            </button>
          </form>
        </div>

        <footer className="footer">
          <p>✨ 매 순간을 소중히 ✨</p>
        </footer>
      </main>
    );
  }

  return (
    <main className="main-content">
      <div className="page-header">
        <h2>🔐 관리자 페이지</h2>
        <button onClick={handleLogout} className="logout-btn">
          로그아웃
        </button>
      </div>

      <div className="admin-dashboard">
        <div className="admin-section">
          <h3>📊 대시보드</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">15</div>
              <div className="stat-label">사용자</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">8</div>
              <div className="stat-label">강의 신청</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">24</div>
              <div className="stat-label">자료</div>
            </div>
          </div>
        </div>

        <div className="admin-section">
          <h3>📋 최근 신청 목록</h3>
          <div className="admin-table">
            <table>
              <thead>
                <tr>
                  <th>이름</th>
                  <th>이메일</th>
                  <th>신청날짜</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>김일민</td>
                  <td>kim@example.com</td>
                  <td>2024-04-12</td>
                  <td>
                    <span className="status pending">대기중</span>
                  </td>
                </tr>
                <tr>
                  <td>이영희</td>
                  <td>lee@example.com</td>
                  <td>2024-04-11</td>
                  <td>
                    <span className="status approved">승인됨</span>
                  </td>
                </tr>
                <tr>
                  <td>박준호</td>
                  <td>park@example.com</td>
                  <td>2024-04-10</td>
                  <td>
                    <span className="status approved">승인됨</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-section">
          <h3>⚙️ 관리 기능</h3>
          <div className="admin-buttons">
            <button className="admin-action-btn">👥 사용자 관리</button>
            <button className="admin-action-btn">📝 자료 관리</button>
            <button className="admin-action-btn">📧 메시지 관리</button>
            <button className="admin-action-btn">⚡ 설정</button>
          </div>
        </div>
      </div>

      <footer className="footer">
        <p>✨ 매 순간을 소중히 ✨</p>
      </footer>
    </main>
  );
}

export default Admin;
