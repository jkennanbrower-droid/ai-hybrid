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

// 4️⃣ Create a test route
app.get("/", (req, res) => {
  res.send("✅ AI Hybrid API is running!");
});
// POST route to talk to OpenAI
app.post("/generate", async (req, res) => {
  const { prompt } = req.body;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful AI web developer who generates clean, modern HTML, CSS, and JS when asked.",
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

// 5️⃣ Start the server
app.listen(3000, () => {
  console.log("🚀 Server is live at http://localhost:3000");
});
