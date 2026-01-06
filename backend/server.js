import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import GoogleSearch from 'google-search-results-nodejs';
import dotenv from 'dotenv';
import Sentiment from 'sentiment';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

dotenv.config();

/* =========================
   🔐 FIREBASE ADMIN (ENV)
   ========================= */
admin.initializeApp({
  credential: admin.credential.cert({
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
  })
});

const db = admin.firestore();
console.log("✅ Successfully connected to Firebase Firestore");

/* =========================
   🤖 GEMINI SETUP
   ========================= */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }
  ]
});

/* =========================
   🌐 EXPRESS SETUP
   ========================= */
const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

/* =========================
   🔍 SERP API + SENTIMENT
   ========================= */
const { getJson } = GoogleSearch;
const SERPAPI_KEY = process.env.SERPAPI_KEY;
const sentiment = new Sentiment();

/* =========================
   🧠 SYSTEM PROMPTS
   ========================= */
const summarizerSystemPrompt = `
You are a summarization AI. Read the following conversation history and extract only the key facts.
Output a concise summary in the third person.
`;

const lunaSystemInstruction = (summary, sentimentHint) => `
You are Luna, an empathetic AI companion.

MEMORY:
${summary}

USER MOOD:
${sentimentHint}

INSTRUCTIONS:
- Remember the user across chats
- Respond empathetically
- Be concise and human
`;

/* =========================
   🚨 CRISIS HANDLING
   ========================= */
const CRISIS_KEYWORDS = [
  'suicide',
  'kill myself',
  'end my life',
  'i want to die',
  'going to die',
  'self harm'
];

/* =========================
   💬 CHAT ENDPOINT
   ========================= */
app.post('/chat', async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: "sessionId and message are required." });
    }

    const lowerMessage = message.toLowerCase();

    /* 🚨 Crisis detection */
    if (CRISIS_KEYWORDS.some(k => lowerMessage.includes(k))) {
      let crisisReply =
        "I hear you. Your life matters. Please reach out for help immediately.\n\n";

      try {
        const searchResults = await getJson({
          api_key: SERPAPI_KEY,
          q: "mental health crisis helpline India",
          location: "India"
        });

        searchResults.organic_results.slice(0, 3).forEach(r => {
          crisisReply += `• ${r.title}: ${r.snippet}\n`;
        });
      } catch {
        crisisReply += "• Vandrevala Foundation: 9999666555\n• iCALL: 9152987821";
      }

      const sessionRef = db.collection('sessions').doc(sessionId);
      const history = (await sessionRef.get()).data()?.history || [];

      await sessionRef.set({
        history: [...history,
          { role: 'user', content: message },
          { role: 'assistant', content: crisisReply }
        ]
      }, { merge: true });

      return res.json({ reply: crisisReply, sentiment: "negative" });
    }

    /* 🧠 Session memory */
    const sessionRef = db.collection('sessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();

    let history = [];
    let summary = "New user.";
    let summaryCounter = 0;

    if (sessionDoc.exists) {
      history = sessionDoc.data().history || [];
      summary = sessionDoc.data().summary || summary;
      summaryCounter = sessionDoc.data().summaryCounter || 0;
    }

    /* 😊 Sentiment */
    const analysis = sentiment.analyze(message);
    let sentimentHint = "neutral";
    if (analysis.score < 0) sentimentHint = "negative (be gentle)";
    else if (analysis.score > 0) sentimentHint = "positive (be cheerful)";

    const geminiHistory = history.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const chatSession = model.startChat({
      history: geminiHistory,
      systemInstruction: {
        role: "model",
        parts: [{ text: lunaSystemInstruction(summary, sentimentHint) }]
      }
    });

    const result = await chatSession.sendMessage(message);
    const reply = result.response.text();

    const newHistory = [...history,
      { role: 'user', content: message },
      { role: 'assistant', content: reply }
    ];

    summaryCounter++;
    let newSummary = summary;

    if (summaryCounter >= 10) {
      const summaryResult = await model.generateContent(
        `${summarizerSystemPrompt}\n${JSON.stringify(newHistory.slice(-10))}`
      );
      newSummary = summaryResult.response.text();
      summaryCounter = 0;
    }

    await sessionRef.set({
      history: newHistory,
      summary: newSummary,
      summaryCounter
    }, { merge: true });

    res.json({ reply, sentiment: sentimentHint });

  } catch (err) {
    console.error("❌ Error in /chat:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* =========================
   🚀 START SERVER
   ========================= */
app.listen(port, () => {
  console.log(`✅ Luna backend running on port ${port}`);
});
