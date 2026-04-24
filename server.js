const express = require("express");
const multer = require("multer");
const cors = require("cors");
const pdfParse = require("pdf-parse");

const app = express();

const upload = multer({ storage: multer.memoryStorage() });
app.use(cors());

// 🔑 PUT YOUR GROQ KEY HERE
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// 🌍 Stable AI endpoint
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

    // 2. Call Groq AI
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
              "You convert long text into clean bullet points. Keep it short and simple."
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

    // 3. Convert to bullet points
    const bullets = output
      .split("\n")
      .map(line => line.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean);

    return res.json({ bullets });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
