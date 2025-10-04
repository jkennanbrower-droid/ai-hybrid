import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import cors from "cors";

// 1️⃣ Load environment variables (your secret key)
dotenv.config();

// 2️⃣ Initialize Express (our web server)
const app = express();
app.use(cors());
app.use(express.json());

// 3️⃣ Connect to OpenAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 4️⃣ Health check route
app.get("/", (req, res) => {
  res.send("✅ AI Hybrid API is running!");
});

/**
 * 5️⃣ Structured reasoning route
 * Why: two-step “think privately → answer clearly” flow
 */
app.post("/api/ask", async (req, res) => {
  const { question } = req.body ?? {};
  if (!question) {
    return res.status(400).json({ error: "Missing 'question' in request body." });
  }

  try {
    // Phase 1: hidden reasoning
    const thought = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Think step-by-step internally. Do NOT reveal this reasoning." },
        { role: "user", content: question },
      ],
    });

    const internal = thought.choices[0].message.content;
    console.log("🤫 Internal reasoning:", internal); // optional debug

    // Phase 2: final answer returned to user
    const final = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Answer clearly and correctly without mentioning internal reasoning." },
        { role: "user", content: `Earlier reasoning: ${internal}` },
      ],
    });

    res.json({ answer: final.choices[0].message.content });
  } catch (err) {
    console.error("AI error:", err);
    res.status(500).json({ error: "AI reasoning failed" });
  }
});

/**
 * 6️⃣ Code generation route
 * Why: single-shot prompt → HTML/CSS/JS output
 */
app.post("/generate", async (req, res) => {
  const { prompt } = req.body ?? {};
  if (!prompt) {
    return res.status(400).json({ error: "Missing 'prompt' in request body." });
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful AI web developer who generates clean, modern HTML, CSS, and JS when asked.",
        },
        { role: "user", content: prompt },
      ],
    });

    const aiResponse = response.choices[0].message.content;
    res.json({ reply: aiResponse });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Something went wrong with OpenAI." });
  }
});

// 7️⃣ Start the server
app.listen(3000, () => {
  console.log("🚀 Server is live at http://localhost:3000");
});
