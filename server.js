const express = require("express");
const multer = require("multer");
const cors = require("cors");
const pdfParse = require("pdf-parse");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

app.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const data = await pdfParse(req.file.buffer);
    const text = data.text;

    if (!text) {
      return res.status(400).json({ error: "Empty PDF" });
    }

    console.log("KEY EXISTS:", !!GROQ_API_KEY);

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
            content: "Turn text into bullet points."
          },
          {
            role: "user",
            content: text.substring(0, 4000)
          }
        ],
        temperature: 0.3
      })
    });

    const rawText = await response.text();

    console.log("STATUS:", response.status);
    console.log("RAW GROQ RESPONSE:", rawText);

    let json;
    try {
      json = JSON.parse(rawText);
    } catch (e) {
      return res.status(500).json({
        error: "Groq did NOT return JSON",
        raw: rawText
      });
    }

    if (!response.ok) {
      return res.status(500).json({
        error: "Groq request failed (REAL ERROR BELOW)",
        status: response.status,
        details: json
      });
    }

    const output = json?.choices?.[0]?.message?.content;

    if (!output) {
      return res.status(500).json({
        error: "No output from Groq",
        raw: json
      });
    }

    const bullets = output
      .split("\n")
      .map(l => l.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean);

    res.json({ bullets });

  } catch (err) {
    console.error("SERVER CRASH:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on", PORT);
});
