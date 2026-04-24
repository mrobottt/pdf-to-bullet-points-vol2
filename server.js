const express = require("express");
const multer = require("multer");
const cors = require("cors");
const pdfParse = require("pdf-parse");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());

// 🔑 API KEY (MUST be set in Render environment variables)
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

    // 2. DEBUG: check API key exists
    if (!GROQ_API_KEY) {
      return res.status(500).json({
        error: "Missing GROQ_API_KEY in Render environment variables"
      });
    }

    // 3. Call Groq
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content: "Turn the text into clean bullet points."
          },
          {
            role: "user",
            content: text.substring(0, 6000)
          }
        ],
        temperature: 0.3
      })
    });

    // 🔥 IMPORTANT: get REAL error
    const rawText = await response.text();

    let dataAI;
    try {
      dataAI = JSON.parse(rawText);
    } catch (err) {
      return res.status(500).json({
        error: "Groq returned non-JSON response",
        raw: rawText
      });
    }

    if (!response.ok) {
      return res.status(500).json({
        error: "Groq request failed",
        status: response.status,
        details: dataAI
      });
    }

    const output = dataAI?.choices?.[0]?.message?.content;

    if (!output) {
      return res.status(500).json({
        error: "No AI output returned",
        raw: dataAI
      });
    }

    // 4. Convert to bullets
    const bullets = output
      .split("\n")
      .map(line => line.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean);

    return res.json({ bullets });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🚀 Render-safe port
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
