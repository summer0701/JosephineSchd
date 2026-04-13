import React, { useState } from "react";

function App() {
  const [name, setName] = useState("");

  return (
    <div>
      <h1>Name Input App</h1>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter your name"
      />
      <p>Hello, {name}!</p>
    </div>
  );
}

export default App;
