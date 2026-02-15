import { GoogleGenAI } from "@google/genai";
import { AppState } from "./types";

export const getBusinessInsights = async (state: AppState): Promise<string> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return "### 📡 Offline Mode\n\nStrategic insights require an active synchronization node.";
  }

  try {
    // Strictly obtaining API key from process.env as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const salesSummary = state.invoices.filter(i => !i.isVoided).slice(-10).map(inv => ({
      total: inv.total,
      date: inv.date,
      items: inv.items.length
    }));

    const prompt = `
      Analyze terminal data: Sales ${JSON.stringify(salesSummary)}.
      Provide 3 high-impact strategic insights for the shop owner.
      Format: Markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    return response.text || "Analysis complete. System stabilized.";
  } catch (error) {
    console.warn("AI Node Synchronization Delayed:", error);
    return "### ⏳ Sync Pending\n\nAI intelligence is currently unreachable.";
  }
};