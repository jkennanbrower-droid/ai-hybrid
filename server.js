import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());            // why: allow your file:// index.html to call localhost:3000
app.use(express.json());    // why: parse JSON bodies like { prompt: "..." }

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,  // put this in .env: OPENAI_API_KEY=sk-...
});

// Health check (quick GET)
app.get("/", (req, res) => res.send("✅ Website Generator API running"));

// ---------- Structured Website Generation ----------
// Returns STRICT JSON: { html, css, js }
app.post("/generate", async (req, res) => {
  const { prompt } = req.body ?? {};
  if (!prompt) {
    return res.status(400).json({ error: "Missing 'prompt' in body." });
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `You generate complete small websites.
Return ONLY strict JSON with keys exactly: "html", "css", "js".
No markdown fences, no extra commentary.

- "html": HTML markup for the page. It may be a full document or just <body> contents, but if full, it must include:
  <link rel="stylesheet" href="style.css"> in <head>
  <script src="script.js"></script> before </body>
- "css": a single stylesheet string (no @import or external links).
- "js": a single script string (no external CDNs). Use vanilla JS only.

General rules:
- Mobile-first responsive layout
- Accessible contrast and semantic tags
- Clean, modern styles (rounded corners, soft shadows welcome)
`
        },
        {
          role: "user",
          content: `Build a small site by this spec:

Spec:
${prompt}

Constraints:
- If you output a full HTML document, include these references:
    <link rel="stylesheet" href="style.css">
    <script src="script.js"></script>
- Keep CSS in one string. Keep JS in one string.
- Do not use external CDNs.`
        }
      ]
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "{}";
    // strip code fences if the model "gets cute"
    const cleaned = raw.replace(/```json|```/g, "");

    let payload;
    try {
      payload = JSON.parse(cleaned);
    } catch (e) {
      console.error("❌ JSON parse failed. Raw model output:\n", raw);
      return res.status(502).json({ error: "Model returned invalid JSON." });
    }

    const { html = "", css = "", js = "" } = payload;
    return res.json({ html, css, js });
  } catch (err) {
    console.error("❌ Generate error:", err);
    return res.status(500).json({ error: "Generation failed" });
  }
});

// (optional) structured reasoning endpoint kept around if you still want it
app.post("/api/ask", async (req, res) => {
  const { question } = req.body ?? {};
  if (!question) return res.status(400).json({ error: "Missing 'question'." });

  try {
    const thought = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Think step-by-step internally. Do NOT reveal this reasoning." },
        { role: "user", content: question }
      ]
    });
    const internal = thought.choices[0].message.content;

    const final = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Answer clearly without mentioning internal reasoning." },
        { role: "user", content: `Earlier reasoning: ${internal}` }
      ]
    });

    res.json({ answer: final.choices[0].message.content });
  } catch (err) {
    console.error("❌ AI error:", err);
    res.status(500).json({ error: "AI reasoning failed" });
  }
});

app.listen(3000, () => {
  console.log("🚀 Server live at http://localhost:3000");
});
