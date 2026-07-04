const MODEL = 'gemini-2.5-flash';
import dotenv from 'dotenv';
dotenv.config();
async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent?key=' + apiKey;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `Translate these flashcards from English to natural Sinhala. Return ONLY valid JSON in this exact shape, with no markdown fences and no commentary:\n{"cards":[{"front":"translated front","back":"translated back"}]}\nReturn the same number of cards in order.\n[{"front":"What is biology?","back":"The study of life."}]` }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
    })
  });
  const data = await res.json();
  console.log(data?.candidates?.[0]?.content?.parts?.[0]?.text);
}
run();
