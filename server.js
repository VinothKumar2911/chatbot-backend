

// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const { GoogleGenerativeAI } = require("@google/generative-ai");

// const app = express();
// app.use(cors());
// app.use(express.json());

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// // Your specialized Physio System Prompt
// const physioSystemInstruction = `
// You are a specialized Physiotherapy Assistant Chatbot designed to support users with movement-based wellness, rehabilitation exercises, and physical therapy guidance.

// ROLE & SCOPE:
// - Provide safe, general information about stretches, strengthening exercises, mobility routines, posture correction, and injury recovery techniques.
// - Offer ergonomic tips and lifestyle adjustments that support physical well-being.
// - Keep all recommendations beginner-friendly, clear, and easy to follow.

// STRICT BOUNDARIES:
// 1. NEVER recommend, suggest, prescribe, or reference any medications, drugs, supplements, or pharmacological treatments (e.g., Ibuprofen, Advil, muscle relaxants, etc.) under any circumstances.
// 2. If a user requests medication advice, respond with: "I'm a physiotherapy assistant and can only provide exercise and movement-based guidance. For medication-related queries, please consult a licensed physician."
// 3. ALWAYS include a disclaimer when providing exercises or recovery advice: "These are general suggestions. Please consult a licensed physiotherapist or healthcare professional before starting any new exercise program, especially if you have a medical condition or injury."
// 4. Do NOT attempt to diagnose any medical condition. If a user describes serious symptoms (e.g., severe pain, numbness, swelling), strongly encourage them to seek immediate professional medical attention.

// TONE & STYLE:
// - Be empathetic, encouraging, and professional.
// - Use simple, jargon-free language.
// - Structure exercise instructions in clear, numbered steps using Markdown.
// `;

// app.post("/chat", async (req, res) => {
//   try {
//     const { message } = req.body;

//     const model = genAI.getGenerativeModel({ 
//         model: "gemini-2.5-flash",
//         systemInstruction: physioSystemInstruction 
//     });

//     const result = await model.generateContent(message);
//     const response = await result.response;
//     const text = response.text();

//     res.json({ reply: text });

//   } catch (error) {
//     console.error("Gemini Error:", error);
//     res.status(500).json({ error: "Physio Assistant is offline. Please try again later." });
//   }
// });

// // Production-ready port configuration
// const PORT = process.env.PORT || 3000;

// app.listen(PORT, () => {
//   console.log(`Chatbot POC running on port ${PORT}`);
// });



require("dotenv").config();
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const systemPrompt = `
You are VAAZI AI, a junior orthopaedic consultation assistant for a licensed orthopaedic organisation.

Start conversation by asking for the user's full name and phone number.

Ask ONLY ONE question at a time like a real consultation.

Assessment order:
1. pain location
2. duration
3. pain severity (1–10)
4. frequency
5. trigger movements
6. swelling / numbness / injury

Never recommend medication.
`;

// memory storage
let chatHistory = [
  { role: "system", content: systemPrompt }
];

app.post("/chat", async (req, res) => {
  try {

    const { message } = req.body;

    // add user message to memory
    chatHistory.push({
      role: "user",
      content: message
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatHistory,
      max_tokens: 250
    });

    const reply = completion.choices[0].message.content;

    // store AI response
    chatHistory.push({
      role: "assistant",
      content: reply
    });

    res.json({ reply });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message || "Vaazi AI is currently unavailable."
    });

  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Vaazi AI chatbot running on port ${PORT}`);
});