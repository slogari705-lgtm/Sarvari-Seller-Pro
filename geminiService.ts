import { GoogleGenAI } from "@google/genai";
import { AppState } from "./types";

export const getBusinessInsights = async (state: AppState): Promise<string> => {
  // Safe check for offline status
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return "### 📡 Local Mode Active\n\nYour business data is currently being stored safely in your local terminal. **AI Insights** require an internet connection to process. Connect to the web to generate a performance audit of your latest sales.";
  }

  try {
    // Attempt to use API
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const salesSummary = state.invoices.filter(i => !i.isVoided).slice(-10).map(inv => ({
      total: inv.total,
      date: inv.date,
      items: inv.items.length
    }));

    const expenseSummary = state.expenses.slice(-5).map(exp => ({
      amount: exp.amount,
      category: exp.category
    }));

    const prompt = `
      As a retail analyst, provide 3 short insights.
      Data: Sales ${JSON.stringify(salesSummary)}, Expenses ${JSON.stringify(expenseSummary)}.
      Focus on growth and efficiency. Use Markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Operational analysis complete. No specific alerts found.";
  } catch (error) {
    console.warn("AI Connection Failed:", error);
    return "### ⏳ Connection Interrupted\n\nWe couldn't reach the Sarvari Intelligence server. Your core POS functions are unaffected. We will retry analysis when your connection improves.";
  }
};