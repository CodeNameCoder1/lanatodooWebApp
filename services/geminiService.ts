import { QuickCommandResult } from "../types";

const API_URL = process.env.VITE_API_URL || 'http://localhost:3000';

const getUserId = (): string => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg && tg.initDataUnsafe?.user?.id) {
        return tg.initDataUnsafe.user.id.toString();
    }
    console.warn("Using dev User ID. In production, open via Telegram.");
    return '123456789';
};

const request = async (endpoint: string, body: any) => {
    const res = await fetch(`${API_URL}/api${endpoint}`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json', 
            'x-user-id': getUserId() 
        },
        body: JSON.stringify(body)
    });
    return await res.json();
};

export const processQuickCommand = async (text: string, currentDate: string): Promise<QuickCommandResult> => {
  try {
    const result = await request('/analyze', { text });
    return result;
  } catch (error) {
    console.error("AI Service Error:", error);
    return { action: 'unknown', data: {}, responseMessage: "Ошибка подключения к серверу." };
  }
};

export const parseBudgetEntry = async (text: string): Promise<{amount: number, category: string, description: string, date: string, type: 'income' | 'expense'} | null> => {
  try {
    const data = await request('/budget/analyze', { text });
    if (data && data.amount) {
      if (data.type) data.type = data.type.toLowerCase();
      return data;
    }
    return null;
  } catch (e) {
    console.error("Budget parse error", e);
    return null;
  }
};

export const generateAnalyticsTip = async (summary: string): Promise<string> => {
  try {
    const data = await request('/tips/generate', { summary });
    return data.tip || "Хорошего дня!";
  } catch (e) {
    return "Продуктивного дня!";
  }
};