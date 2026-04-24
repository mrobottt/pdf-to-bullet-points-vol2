const express = require("express");
const multer = require("multer");
const cors = require("cors");
const pdfParse = require("pdf-parse");

const app = express();

// If Render provides fetch, this keeps it safe
const fetch = global.fetch;

const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());

// 🔑 Groq API key (set this in Render environment variables)
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// 🌍 Groq endpoint
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

app.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // 1. Extract PDF text
    const data = await pdfParse(req.file.buffer);
    const text = data.text;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Empty PDF text" });
    }

    // 2. Call Groq API
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content:
              "You convert long text into clear, short bullet points."
          },
          {
            role: "user",
            content: text.substring(0, 6000)
          }
        ],
        temperature: 0.3
      })
    });

    const dataAI = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: "Groq request failed",
        details: dataAI
      });
    }

    const output = dataAI?.choices?.[0]?.message?.content;

    if (!output) {
      return res.status(500).json({ error: "No AI response returned" });
    }

    // 3. Convert AI response to bullets
    const bullets = output
      .split("\n")
      .map(line => line.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean);

    res.json({ bullets });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🚀 IMPORTANT: ONLY ONE LISTEN (Render compatible)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
