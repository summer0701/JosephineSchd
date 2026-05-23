import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const SHEET_ID = "1B3EHtBTg-uyolVGvJz0y5sP2Jj2NjGzR0nj17vLRsfY";
const LOGIN_USER_KEY = "josephineLoginUser";
const LOGIN_CLASS_KEY = "josephineLoginClass";

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

const getLoginUsers = async () => {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("로그인 정보를 불러오지 못했습니다.");
  }

  const rows = parseCsv(await response.text());
  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim());
  const classIndex = headers.findIndex((header) => header === "클래스명");
  const nameIndex = headers.findIndex((header) => header === "이름");
  const passwordIndex = headers.findIndex((header) => header === "비밀번호");
  const resolvedClassIndex = classIndex >= 0 ? classIndex : 0;
  const resolvedNameIndex = nameIndex >= 0 ? nameIndex : 0;
  const resolvedPasswordIndex = passwordIndex >= 0 ? passwordIndex : 1;

  return rows.slice(1).map((row) => ({
    className: (row[resolvedClassIndex] || "").trim(),
    name: (row[resolvedNameIndex] || "").trim(),
    password: (row[resolvedPasswordIndex] || "").trim(),
  }));
};

function Login() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const users = await getLoginUsers();
      const matchedUser = users.find(
        (user) => user.name === name.trim() && user.password === password.trim()
      );

      if (!matchedUser) {
        setErrorMessage("아이디 또는 비밀번호가 올바르지 않습니다.");
        return;
      }

      localStorage.setItem(LOGIN_USER_KEY, matchedUser.name);
      localStorage.setItem(LOGIN_CLASS_KEY, matchedUser.className || "class1");
      navigate("/flashcards");
    } catch (error) {
      console.error("로그인 오류:", error);
      setErrorMessage("로그인 정보를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>로그인</h2>
        <p>강의 페이지에 접속하려면 아래에 로그인해주세요.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="name">아이디</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="아이디를 입력하세요"
            autoComplete="username"
            required
          />

          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="비밀번호를 입력하세요"
            autoComplete="current-password"
            required
          />

          {errorMessage && <div className="error-message">{errorMessage}</div>}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "확인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
