


// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const OpenAI = require("openai");

// const app = express();
// app.use(cors());
// app.use(express.json());

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY
// });

// const systemPrompt = `
// You are VAAZI AI, a junior orthopaedic consultation assistant for a licensed orthopaedic organisation.

// INTRODUCTION

// Begin every new conversation with:

// Hello! I'm Vaazi AI, your orthopaedic assistant. I'm here to help you with movement-based guidance and connect you with our orthopaedic specialists.

// ⚠️ Disclaimer: I provide general information only — not medical diagnosis or treatment. Always consult a licensed orthopaedic surgeon or doctor before beginning any exercise program.

// Before we begin, may I have:
// • Your full name
// • Your phone number

// This helps us connect you with our specialists if needed.

// CONVERSATION STYLE

// Ask ONLY ONE question at a time like a real consultation.

// Assessment order:

// 1. pain location
// 2. duration
// 3. pain severity (1–10)
// 4. frequency
// 5. trigger movements
// 6. swelling / numbness / injury

// TRIAGE RULES

// If red flags appear:
// • pain ≥7
// • swelling
// • numbness
// • trauma
// • inability to move

// Advise orthopaedic consultation.

// However provide ONE gentle complementary exercise for comfort.

// EXERCISE RULES

// Provide MAXIMUM 2 exercises.

// Format:

// 1. Exercise Name
// Steps

// 2. Exercise Name
// Steps

// STRICT BOUNDARIES

// Never recommend medication.

// If asked about medication say:

// "I'm Vaazi AI, an orthopaedic assistant. I can only provide movement-based guidance. For medication-related queries, please consult a licensed physician."

// Never diagnose medical conditions.
// always check the mobile number should be of 10 digits and should be numeric.
// `;

// // memory storage
// let chatHistory = [
//   { role: "system", content: systemPrompt }
// ];

// app.post("/chat", async (req, res) => {
//   try {

//     const { message } = req.body;

//     // add user message to memory
//     chatHistory.push({
//       role: "user",
//       content: message
//     });

//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: chatHistory,
//       max_tokens: 250
//     });

//     const reply = completion.choices[0].message.content;

//     // store AI response
//     chatHistory.push({
//       role: "assistant",
//       content: reply
//     });

//     res.json({ reply });

//   } catch (error) {

//     console.error(error);

//     res.status(500).json({
//       error: error.message || "Vaazi AI is currently unavailable."
//     });

//   }
// });

// const PORT = process.env.PORT || 3000;

// app.listen(PORT, () => {
//   console.log(`Vaazi AI chatbot running on port ${PORT}`);
// });



require("dotenv").config();
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

/* ---------------- DATABASE CONNECTION ---------------- */

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
});

/* ---------------- OPENAI ---------------- */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ---------------- SYSTEM PROMPT ---------------- */

const systemPrompt = `
You are VAAZI AI, a junior orthopaedic consultation assistant for a licensed orthopaedic organisation.

INTRODUCTION

Begin every new conversation with:

Hello! I'm Vaazi AI, your orthopaedic assistant. I'm here to help you with movement-based guidance and connect you with our orthopaedic specialists.

⚠️ Disclaimer: I provide general information only — not medical diagnosis or treatment.

Before we begin, may I have:
• Your full name
• Your phone number

This helps us connect you with our specialists if needed.

CONVERSATION STYLE
Ask ONLY ONE question at a time.

TRIAGE RULES
If pain ≥7, swelling, numbness, trauma → advise orthopaedic consultation.

EXERCISE RULES
Provide MAXIMUM 2 exercises.

Never recommend medication.
Never diagnose medical conditions.
Phone number must be 10 digits numeric.
`;

/* ---------------- CHAT API ---------------- */

app.post("/chat", async (req, res) => {
  try {

    const { message, full_name, phone_number, conversation_id } = req.body;

    let userId;
    let convId = conversation_id;

    /* ---------------- USER HANDLING ---------------- */

    if (full_name && phone_number) {

      const userResult = await pool.query(
        `INSERT INTO users (full_name, phone_number)
         VALUES ($1,$2)
         ON CONFLICT (phone_number)
         DO UPDATE SET full_name = EXCLUDED.full_name
         RETURNING user_id`,
        [full_name, phone_number]
      );

      userId = userResult.rows[0].user_id;

      const convResult = await pool.query(
        `INSERT INTO conversations (user_id)
         VALUES ($1)
         RETURNING conversation_id`,
        [userId]
      );

      convId = convResult.rows[0].conversation_id;
    }

    /* ---------------- LOAD CHAT HISTORY ---------------- */

    const historyResult = await pool.query(
      `SELECT sender_role AS role, message_text AS content
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at`,
      [convId]
    );

    const chatHistory = [
      { role: "system", content: systemPrompt },
      ...historyResult.rows
    ];

    /* ---------------- ADD USER MESSAGE ---------------- */

    chatHistory.push({
      role: "user",
      content: message
    });

    await pool.query(
      `INSERT INTO messages (conversation_id, sender_role, message_text)
       VALUES ($1,$2,$3)`,
      [convId, "user", message]
    );

    /* ---------------- OPENAI RESPONSE ---------------- */

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatHistory,
      max_tokens: 250
    });

    const reply = completion.choices[0].message.content;

    /* ---------------- SAVE AI MESSAGE ---------------- */

    await pool.query(
      `INSERT INTO messages (conversation_id, sender_role, message_text)
       VALUES ($1,$2,$3)`,
      [convId, "assistant", reply]
    );

    res.json({
      reply,
      conversation_id: convId
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Vaazi AI is currently unavailable."
    });

  }
});

/* ---------------- SERVER ---------------- */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Vaazi AI chatbot running on port ${PORT}`);
});