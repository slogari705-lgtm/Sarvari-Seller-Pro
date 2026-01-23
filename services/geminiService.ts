
import { GoogleGenAI } from "@google/genai";
import { AppState } from "../types";

export const getBusinessInsights = async (state: AppState): Promise<string> => {
  // Check for offline status immediately
  if (!navigator.onLine) {
    return "You are currently working offline. Connect to the internet to generate new AI insights.";
  }

  // Use process.env.API_KEY directly as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const salesSummary = state.invoices.slice(-10).map(inv => ({
    total: inv.total,
    date: inv.date,
    items: inv.items.length
  }));

  const expenseSummary = state.expenses.slice(-5).map(exp => ({
    amount: exp.amount,
    category: exp.category
  }));

  const prompt = `
    As a professional retail business analyst, analyze the following recent business data and provide 3-4 concise, actionable insights for improvement.
    
    Recent Sales: ${JSON.stringify(salesSummary)}
    Recent Expenses: ${JSON.stringify(expenseSummary)}
    Total Products: ${state.products.length}
    Total Customers: ${state.customers.length}

    Focus on profitability, stock trends, and customer engagement.
    Keep the tone professional and helpful. Use Markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "No insights available at the moment.";
  } catch (error) {
    console.error("AI Insight Error:", error);
    return "Failed to connect to AI analyst. Please check your internet connection.";
  }
};
