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
  if (!prompt) return res.status(400).json({ error: "Missing 'prompt' in body." });

  try {
    // Ask the model to return strict JSON with html/css/js fields
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You generate complete small websites. 
Return ONLY strict JSON with keys: html, css, js.
No Markdown fences, no extra text.`
        },
        {
          role: "user",
          content: `Build a small site as requested:
Spec: ${prompt}

Constraints:
- Keep CSS in a single string (no imports).
- Keep JS in a single string (no external CDNs).
- The HTML must reference the CSS and JS as if in separate files: <link rel="stylesheet" href="style.css"> and <script src="script.js"></script>.
- Use modern semantic HTML.`
        }
      ],
      temperature: 0.7
    });

    // Try to parse model output as JSON
    const raw = response.choices[0].message.content?.trim() ?? "{}";
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      // fallback: strip code fences if model added them
      const cleaned = raw.replace(/```json|```/g, "");
      payload = JSON.parse(cleaned);
    }

    const { html = "", css = "", js = "" } = payload;

    res.json({ html, css, js });
  } catch (err) {
    console.error("Generate error:", err);
    res.status(500).json({ error: "Generation failed" });
  }
});
app.post("/generate", async (req, res) => {
  const { prompt } = req.body ?? {};
  if (!prompt) return res.status(400).json({ error: "Missing 'prompt' in body." });
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `Return ONLY strict JSON with keys: html, css, js. No markdown fences.` },
        {
          role: "user",
          content: `Build a small site:
Spec: ${prompt}
Constraints:
- HTML references <link rel="stylesheet" href="style.css"> and <script src="script.js"></script>.
- Keep all CSS in one string; JS in one string.`
        }
      ],
      temperature: 0.7
    });

    const raw = response.choices[0].message.content?.trim() ?? "{}";
    let payload;
    try { payload = JSON.parse(raw); }
    catch { payload = JSON.parse(raw.replace(/```json|```/g, "")); }

    const { html = "", css = "", js = "" } = payload;
    res.json({ html, css, js });
  } catch (err) {
    console.error("Generate error:", err);
    res.status(500).json({ error: "Generation failed" });
  }
});

// 7️⃣ Start the server
app.listen(3000, () => {
  console.log("🚀 Server is live at http://localhost:3000");
});
