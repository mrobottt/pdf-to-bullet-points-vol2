const express = require("express");
const multer = require("multer");
const cors = require("cors");
const pdfParse = require("pdf-parse");

const app = express();

const upload = multer({ storage: multer.memoryStorage() });
app.use(cors());

// 🔑 API KEY (must be set in Render environment variables)
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

    if (!GROQ_API_KEY) {
      return res.status(500).json({
        error: "Missing GROQ_API_KEY in environment variables"
      });
    }

    // 2. Call Groq API
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
            content: "Convert text into short, clear bullet points."
          },
          {
            role: "user",
            content: text.substring(0, 4000)
          }
        ],
        temperature: 0.3
      })
    });

    // 🔥 FIXED: read response ONCE only
    const rawText = await response.text();

    console.log("STATUS:", response.status);
    console.log("RAW GROQ RESPONSE:", rawText);

    let dataAI;
    try {
      dataAI = JSON.parse(rawText);
    } catch (e) {
      return res.status(500).json({
        error: "Groq returned invalid JSON",
        raw: rawText
      });
    }

    // ❌ Groq error handling
    if (!response.ok) {
  const rawText = await response.text();

  console.log("🔥 GROQ STATUS:", response.status);
  console.log("🔥 GROQ RAW RESPONSE:");
  console.log(rawText);

  return res.status(500).json({
    error: "Groq request failed",
    status: response.status,
    raw: rawText
  });
}

    const output = dataAI?.choices?.[0]?.message?.content;

    if (!output) {
      return res.status(500).json({
        error: "No AI output returned",
        raw: dataAI
      });
    }

    // 3. Convert to bullet points
    const bullets = output
      .split("\n")
      .map(line => line.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean);

    return res.json({ bullets });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

// 🚀 Render-safe port
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
