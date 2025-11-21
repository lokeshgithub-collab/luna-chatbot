import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import fs from 'fs';
import GoogleSearch from 'google-search-results-nodejs';
const { getJson } = GoogleSearch;
import dotenv from 'dotenv';
import Sentiment from 'sentiment';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'; // New Library

dotenv.config();

const serviceAccountFile = fs.readFileSync('./serviceAccountKey.json');
const serviceAccount = JSON.parse(serviceAccountFile);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
console.log("✅ Successfully connected to Firebase Firestore");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ]
}); 

const app = express();
const port = 8000;
app.use(cors());
app.use(express.json());

const SERPAPI_KEY = process.env.SERPAPI_API_KEY;
const sentiment = new Sentiment();

const summarizerSystemPrompt = `
  You are a summarization AI. Read the following conversation history and extract only the key facts.
  Output a concise summary in the third person. Example: "The user's name is Lokesh. He recently had a breakup and is feeling depressed."
`;

const lunaSystemInstruction = (summary, sentimentHint) => `
  You are Luna, an empathetic AI companion.
  
  **MEMORY & CONTEXT:**
  Summary of past conversations: ${summary}
  
  **CURRENT EMOTIONAL STATE:**
  The user's current mood seems: ${sentimentHint}
  
  **INSTRUCTIONS:**
  1. **CONTEXT:** Use the summary to remember the user. If they ask "do you remember me", prove it by stating facts from the summary.
  2. **EMPATHY:** Respond naturally based on the sentiment hint.
  3. **SAFETY:** If the user mentions self-harm, you must prioritize safety, but the system handles the immediate crisis response.
  4. **ROLE:** You are not a doctor. Keep responses conversational and concise.
`;

const CRISIS_KEYWORDS = ['suicide', 'kill myself', 'end my life', 'i want to die', 'going to die', 'self harm'];

app.post('/chat', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    if (!sessionId || !message) {
      return res.status(400).json({ error: "sessionId and message are required." });
    }
    
    const lowerCaseMessage = message.toLowerCase();

    if (CRISIS_KEYWORDS.some(keyword => lowerCaseMessage.includes(keyword))) {
        console.log("🚨 Crisis keyword detected.");
        let crisisReply = "I hear you, and I want you to know that your life is valuable. It sounds like you are in immense pain. Please reach out for help immediately. Here are some resources:\n\n";

        try {
            const searchResults = await getJson({
                api_key: SERPAPI_KEY,
                q: "mental health crisis helpline India",
                location: "India"
            });
            const topResults = searchResults.organic_results.slice(0, 3);
            topResults.forEach(result => { crisisReply += `• ${result.title}: ${result.snippet}\n`; });
        } catch (searchError) {
            console.error("Search failed, using fallback:", searchError.message);
            crisisReply += "• Vandrevala Foundation: 9999666555\n• iCALL: 9152987821";
        }
        
        const sessionRef = db.collection('sessions').doc(sessionId);
        const history = (await sessionRef.get()).data()?.history || [];
        const newHistory = [...history, { role: 'user', content: message }, { role: 'assistant', content: crisisReply }];
        await sessionRef.set({ history: newHistory }, { merge: true });

        return res.json({ reply: crisisReply, sentiment: "negative" });
    }

    const sessionRef = db.collection('sessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();
    let history = [], summary = "New user.", summaryCounter = 0;

    if (sessionDoc.exists) {
        history = sessionDoc.data().history || [];
        summary = sessionDoc.data().summary || "New user.";
        summaryCounter = sessionDoc.data().summaryCounter || 0;
    }

    const analysis = sentiment.analyze(message);
    let sentimentHint = "neutral";
    if (analysis.score < 0) sentimentHint = "negative (be gentle)";
    else if (analysis.score > 0) sentimentHint = "positive (be cheerful)";
    console.log(`Sentiment: ${sentimentHint}`);

    const geminiHistory = history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    const chatSession = model.startChat({
        history: geminiHistory,
        systemInstruction: {
            parts: [{ text: lunaSystemInstruction(summary, sentimentHint) }],
            role: "model"
        }
    });

    const result = await chatSession.sendMessage(message);
    const response = result.response;
    const finalReply = response.text();

    const newHistory = [...history, { role: 'user', content: message }, { role: 'assistant', content: finalReply }];
    
    summaryCounter++;
    let newSummary = summary;

    if (summaryCounter >= 10) {
        console.log("Updating summary...");
        const summaryResult = await model.generateContent(
            `${summarizerSystemPrompt}\n\nHere is the conversation:\n${JSON.stringify(newHistory.slice(-10))}`
        );
        newSummary = summaryResult.response.text();
        summaryCounter = 0;
        console.log("New Summary:", newSummary);
    }
    
    await sessionRef.set({ history: newHistory, summary: newSummary, summaryCounter: summaryCounter }, { merge: true });

    res.json({ reply: finalReply, sentiment: sentimentHint });

  } catch (error) {
    console.error("Error in /chat endpoint:", error);
    res.status(500).json({ error: "An unexpected error occurred." });
  }
});

app.listen(port, () => {
  console.log(`✅ Luna's brain is listening on http://localhost:${port}`);
  console.log("✨ Connected to Google Gemini (Cloud). You can close LM Studio.");
});