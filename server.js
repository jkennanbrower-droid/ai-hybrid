import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());            // allow file:// index.html to call localhost:3000
app.use(express.json());    // parse JSON bodies

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Health check
app.get("/", (_req, res) => res.send("✅ Website Generator API running"));

// --- Structured Website Generation: returns { html, css, js } ---
app.post("/generate", async (req, res) => {
  const { prompt } = req.body ?? {};
  if (!prompt) return res.status(400).json({ error: "Missing 'prompt' in body." });

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

- "html": page markup (may be full doc). If full, include:
  <link rel="stylesheet" href="style.css"> in <head>
  <script src="script.js"></script> before </body>
- "css": one stylesheet string (no @import or external links)
- "js": one script string (vanilla JS only; no CDNs)

Use semantic HTML, accessible contrast, and mobile-first responsive layouts.`
        },
        {
          role: "user",
          content: `Build a small site:

Spec:
${prompt}

Constraints:
- If full HTML document, include the exact references above.
- Keep CSS in one string; JS in one string.
- No external CDNs.`
        }
      ]
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "{}";
    const cleaned = raw.replace(/```json|```/g, ""); // just in case

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

// (optional) keep /api/ask if you still want the reasoning demo
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
