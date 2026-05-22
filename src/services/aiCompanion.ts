// src/services/aiCompanion.ts

export interface ChatMessage {
  id: string;
  sender: 'user' | 'companion';
  text: string;
  timestamp: Date;
}

// Fallback high-fidelity empathetic responses based on keywords
const FALLBACK_RESPONSES = [
  {
    keywords: ['miss', 'fajr', 'sleep', 'wake up', 'morning'],
    response: "Beloved sister/brother, waking for Fajr is a journey of love. Do not feel discouraged. Try placing your alarm far from your bed, and read the Sunnah prayers before sleep. Remember, Allah's mercy is wide. Let's make an intention together tonight, and ask Him to make it easy. We can set a soft reminder 10 minutes earlier."
  },
  {
    keywords: ['consistent', 'track', 'habit', 'lazy', 'motivation'],
    response: "Building consistency is like growing a seed—it takes gentle, daily watering. Rather than focusing on perfect streaks, focus on returning to the prayer mat. Each Sajdah is a direct meeting with your Creator. If you miss a prayer, stand up and perform Qaza immediately with a hopeful heart. Allah loves the small, persistent deeds the most."
  },
  {
    keywords: ['qaza', 'recover', 'calculate', 'many prayers', 'years'],
    response: "Calculating a lifetime of missed prayers can feel overwhelming, but you have already taken the most beautiful step: the sincere intention to make them up. In your Qaza Recovery Planner, we have created 'Light Mode' (just 1 extra daily prayer per Salah). This will get you there systematically without causing burnout. Mercy and steady progress are the keys."
  },
  {
    keywords: ['stress', 'anxiety', 'sad', 'depressed', 'worry'],
    response: "Stand in prayer, and let the worries of the dunya slide off your shoulders in Sajdah. The Prophet (peace be upon him) used to say, 'O Bilal, give us comfort with the prayer.' Pour your heart out in your prostrations; there is no filter between you and your Creator. You are never alone."
  },
  {
    keywords: ['hello', 'hi', 'assalamu', 'salam'],
    response: "Wa Alaikum Assalam wa Rahmatullah! I am your Sajdah Spiritual Companion. I am here to walk alongside you in your journey of prayer, consistency, and Qaza recovery, with kindness and mercy. How are you feeling today?"
  }
];

const DEFAULT_RESPONSE = "Thank you for sharing this with me. Remember, your relationship with Salah is unique, and progress is better than perfection. Allah's mercy is infinite, and every effort you make is seen and appreciated. Let's work together step-by-step. What is one small, manageable spiritual goal we can focus on today?";

/**
 * Communicates with the AI spiritual companion.
 * Automatically attempts to use Gemini API if a key is provided, or falls back to
 * our rich local rule-based emotional counseling engine.
 */
export async function getCompanionResponse(
  messageText: string,
  history: ChatMessage[],
  apiKey?: string
): Promise<string> {
  const query = messageText.toLowerCase();

  // If Gemini API Key is present, attempt live communication
  if (apiKey && apiKey.trim().length > 0) {
    try {
      // Setup live Gemini API fetch request
      const formattedHistory = history.map(h => ({
        role: h.sender === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      }));

      // Add system prompt to guide the tone of the companion
      const systemInstruction = 
        "You are Sajdah, a comforting, peaceful, and empathetic Islamic AI Spiritual Companion. " +
        "Your role is to help the user build consistency in Salah (prayer) and track/recover lifetime missed prayers (Qaza). " +
        "You must respond with high Islamic etiquette (Adab), deep compassion, mercy, and support. " +
        "AVOID issuing fatwas, giving legal rulings, or using guilt-heavy/fear-based language. " +
        "Keep your advice practical, structured, and hopeful. Encourage gentle, sustainable habits.";

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: `System Instruction: ${systemInstruction}` }] },
              ...formattedHistory,
              { role: 'user', parts: [{ text: messageText }] }
            ],
            generationConfig: {
              maxOutputTokens: 300,
              temperature: 0.7,
            }
          })
        }
      );

      const data = await response.json();
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }
    } catch (e) {
      console.warn("Gemini API call failed, falling back to local companion engine.", e);
    }
  }

  // Local Rule-Based High Fidelity Fallback (Runs instant and offline)
  await new Promise(resolve => setTimeout(resolve, 800)); // Add subtle delay to feel realistic

  for (const item of FALLBACK_RESPONSES) {
    if (item.keywords.some(kw => query.includes(kw))) {
      return item.response;
    }
  }

  return DEFAULT_RESPONSE;
}
