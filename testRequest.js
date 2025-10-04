// testRequest.js
import fetch from "node-fetch";

const res = await fetch("http://localhost:3000/api/ask", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ question: "Why do humans need sleep?" }),
});

const data = await res.json();
console.log("AI Answer:", data.answer);
