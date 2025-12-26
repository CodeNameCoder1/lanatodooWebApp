require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const cron = require('node-cron');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// --- CONFIGURATION ---
const BOT_TOKEN = process.env.BOT_TOKEN; 
const WEBAPP_URL = process.env.WEBAPP_URL;
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

// Устанавливаем часовой пояс
const TIMEZONE = 'Europe/Moscow'; 

if (!BOT_TOKEN || !API_KEY) {
  console.error("❌ Error: Missing credentials in .env file");
  process.exit(1);
}

// --- DATABASE SETUP ---
const DB_FILE = path.join(__dirname, 'bot_db.json');

const initDb = () => {
  if (!fs.existsSync(DB_FILE)) {
    const initial = { users: {} }; 
    fs.writeFileSync(DB_FILE, JSON.stringify(initial));
  }
};
initDb();

const loadDb = () => {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Database load error:", err);
    return { users: {} };
  }
};

const saveDb = (data) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Database save error:", err);
  }
};

const getUserData = (db, userId) => {
  if (!db.users[userId]) {
    db.users[userId] = {
      todos: [], transactions: [], events: [], notes: [], goals: [],
      settings: { notifications: true }
    };
  }
  return db.users[userId];
};

// --- AI CLIENT SETUP ---
const ai = new OpenAI({
  apiKey: API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});
const MODEL_NAME = 'llama-3.3-70b-versatile';

// --- HELPERS ---

// 🔥 БЕЗОПАСНАЯ ОТПРАВКА СООБЩЕНИЙ 🔥
async function replyWithFallback(ctx, text, extra = {}) {
    try {
        await ctx.reply(text, { ...extra, parse_mode: 'Markdown' });
    } catch (e) {
        console.error("Markdown Error caught. Sending plain text fallback.");
        const { parse_mode, ...safeExtra } = extra; 
        await ctx.reply(text, safeExtra);
    }
}

function formatUserContext(user) {
  const now = new Date();
  
  const activeTodos = user.todos
    .filter(t => !t.completed)
    .map(t => `- [Task] ${t.title} (${t.priority})`)
    .join('\n');

  const upcomingEvents = user.events
    .filter(e => new Date(e.date) >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5)
    .map(e => `- [Event] ${e.title} at ${new Date(e.date).toLocaleString('ru-RU', { timeZone: TIMEZONE })}`)
    .join('\n');

  return `
  USER DATA CONTEXT:
  Todos:
  ${activeTodos || "No active tasks"}
  
  Upcoming Events:
  ${upcomingEvents || "No upcoming events"}
  `;
}

async function analyzeMessage(text, userData) {
  const humanDate = new Date().toLocaleString('ru-RU', { 
    timeZone: TIMEZONE, 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const dataContext = formatUserContext(userData);

  try {
    const completion = await ai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        {
          role: "system",
          content: `
          Role: You are Lana, a smart, friendly, and structured Personal Assistant.
          CURRENT DATE/TIME (${TIMEZONE}): ${humanDate}.
          ${dataContext}
          YOUR GOAL: Analyze user input, decide ACTION, and generate a BEAUTIFUL response in Russian using Markdown V1.

          POSSIBLE ACTIONS (Return JSON):
          1. IF user wants to ADD/CREATE data: "create_event", "create_transaction", "create_task", "create_note".
          2. IF user asks for LINK: "send_link".
          3. IF user wants to CHAT: "chat".
          
          For "create_transaction", extract "amount", "category", "type" (expense/income).
          `
        },
        { role: "user", content: text }
      ],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    return JSON.parse(content);
  } catch (e) {
    console.error("AI Analysis Error", e);
    return { action: 'chat', responseMessage: 'Прости, я немного запуталась 😔. Попробуй еще раз.' };
  }
}

async function analyzeBudget(text) {
  try {
      const completion = await ai.chat.completions.create({
          model: MODEL_NAME,
          messages: [
              {
                  role: "system",
                  content: `
                  Role: Financial Assistant.
                  Current Date: ${new Date().toISOString()}.
                  Task: Analyze text and extract transaction details.
                  Return JSON:
                  {
                      "amount": number,
                      "category": "string (Short Russian category)",
                      "description": "string",
                      "date": "ISO string",
                      "type": "income" | "expense"
                  }
                  Keywords for Expense: купил, потратил, минус, оплатил, такси, еда.
                  Keywords for Income: получил, зарплата, плюс, пришло, перевод.
                  `
              },
              { role: "user", content: text }
          ],
          response_format: { type: "json_object" }
      });
      return JSON.parse(completion.choices[0].message.content);
  } catch (e) {
      console.error("Budget AI Error", e);
      return null;
  }
}

async function generateDashboardTip(summary) {
  try {
      const completion = await ai.chat.completions.create({
          model: MODEL_NAME,
          messages: [
              { role: "system", content: "You are a helpful assistant. Provide a very short (max 15 words) motivational tip in Russian." },
              { role: "user", content: `User Status: ${summary}` }
          ]
      });
      return completion.choices[0].message.content.replace(/"/g, '');
  } catch (e) {
      return "Хорошего дня!";
  }
}

async function generateMorningMotivation(eventsCount) {
  try {
    const completion = await ai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: `Generate a short morning greeting in Russian for a user with ${eventsCount} events. Use emojis.` }
      ],
      max_tokens: 150
    });
    return completion.choices[0].message.content;
  } catch (e) {
    return `Доброе утро! ☀️ У вас сегодня ${eventsCount} событий.`;
  }
}

// --- EXPRESS SERVER ---
const app = express();
app.use(cors());
app.use(bodyParser.json());

const requireUser = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }
  req.userId = userId.toString();
  next();
};

app.post('/api/analyze', requireUser, async (req, res) => {
  try {
    const { text } = req.body;
    const db = loadDb();
    const userData = getUserData(db, req.userId);
    const result = await analyzeMessage(text, userData);
    res.json(result);
  } catch (error) {
    console.error("API Analyze Error:", error);
    res.status(500).json({ action: 'unknown', responseMessage: "Ошибка сервера." });
  }
});

// NEW AI ENDPOINTS
app.post('/api/budget/analyze', requireUser, async (req, res) => {
  const { text } = req.body;
  const result = await analyzeBudget(text);
  res.json(result || {});
});

app.post('/api/tips/generate', requireUser, async (req, res) => {
  const { summary } = req.body;
  const result = await generateDashboardTip(summary);
  res.json({ tip: result });
});

app.get('/api/sync', requireUser, (req, res) => {
  const db = loadDb();
  const userData = getUserData(db, req.userId);
  res.json(userData);
});

// --- TODOS ---
app.post('/api/todos', requireUser, (req, res) => {
  const db = loadDb(); const userData = getUserData(db, req.userId);
  const newTodo = { ...req.body, id: Math.random().toString(36).substr(2, 9), createdAt: Date.now() };
  userData.todos.push(newTodo); saveDb(db); res.json(newTodo);
});
app.patch('/api/todos/:id', requireUser, (req, res) => {
  const db = loadDb(); const userData = getUserData(db, req.userId);
  const todo = userData.todos.find(t => t.id === req.params.id);
  if (todo) { todo.completed = !todo.completed; saveDb(db); }
  res.json({ success: true });
});
app.delete('/api/todos/:id', requireUser, (req, res) => {
  const db = loadDb(); const userData = getUserData(db, req.userId);
  userData.todos = userData.todos.filter(t => t.id !== req.params.id);
  saveDb(db); res.json({ success: true });
});

// --- TRANSACTIONS ---
app.post('/api/transactions', requireUser, (req, res) => {
  const db = loadDb(); const userData = getUserData(db, req.userId);
  const newTx = { ...req.body, id: Math.random().toString(36).substr(2, 9) };
  userData.transactions.push(newTx); saveDb(db); res.json(newTx);
});
app.delete('/api/transactions/:id', requireUser, (req, res) => {
  const db = loadDb(); const userData = getUserData(db, req.userId);
  userData.transactions = userData.transactions.filter(t => t.id !== req.params.id);
  saveDb(db); res.json({ success: true });
});

// --- EVENTS ---
app.post('/api/events', requireUser, (req, res) => {
  const db = loadDb(); const userData = getUserData(db, req.userId);
  const newEvent = { ...req.body, id: Math.random().toString(36).substr(2, 9), completed: false };
  userData.events.push(newEvent); saveDb(db); res.json(newEvent);
});
app.delete('/api/events/:id', requireUser, (req, res) => {
  const db = loadDb(); const userData = getUserData(db, req.userId);
  userData.events = userData.events.filter(t => t.id !== req.params.id);
  saveDb(db); res.json({ success: true });
});

// --- GOALS ---
app.post('/api/goals', requireUser, (req, res) => {
  const db = loadDb(); const userData = getUserData(db, req.userId);
  const newGoal = { ...req.body, id: Math.random().toString(36).substr(2, 9), completed: false };
  userData.goals.push(newGoal); saveDb(db); res.json(newGoal);
});
app.patch('/api/goals/:id', requireUser, (req, res) => {
  const db = loadDb(); const userData = getUserData(db, req.userId);
  const goal = userData.goals.find(g => g.id === req.params.id);
  if (goal) { goal.completed = !goal.completed; saveDb(db); }
  res.json({ success: true });
});
app.delete('/api/goals/:id', requireUser, (req, res) => {
  const db = loadDb(); const userData = getUserData(db, req.userId);
  userData.goals = userData.goals.filter(t => t.id !== req.params.id);
  saveDb(db); res.json({ success: true });
});

// --- NOTES ---
app.post('/api/notes', requireUser, (req, res) => {
  const db = loadDb(); const userData = getUserData(db, req.userId);
  const newNote = { ...req.body, id: Math.random().toString(36).substr(2, 9), createdAt: Date.now() };
  userData.notes.push(newNote); saveDb(db); res.json(newNote);
});
app.patch('/api/notes/:id', requireUser, (req, res) => {
  const db = loadDb(); const userData = getUserData(db, req.userId);
  const note = userData.notes.find(n => n.id === req.params.id);
  if (note && req.body.content) { 
      note.content = req.body.content;
      saveDb(db); 
  }
  res.json({ success: true });
});
app.delete('/api/notes/:id', requireUser, (req, res) => {
  const db = loadDb(); const userData = getUserData(db, req.userId);
  userData.notes = userData.notes.filter(t => t.id !== req.params.id);
  saveDb(db); res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
});

// --- TELEGRAM BOT LOGIC ---
const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
  const db = loadDb();
  getUserData(db, ctx.chat.id);
  saveDb(db);
  const buttons = [];
  if (WEBAPP_URL) {
    buttons.push([Markup.button.webApp('🚀 Открыть LanaTodoo', WEBAPP_URL)]);
  }
  replyWithFallback(ctx, `Привет, ${ctx.from.first_name}! 👋`, Markup.inlineKeyboard(buttons));
});

bot.on('text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) return;
  await ctx.sendChatAction('typing');
  try {
    const db = loadDb();
    const user = getUserData(db, ctx.chat.id);
    const result = await analyzeMessage(ctx.message.text, user);

    if (result.action === 'send_link') {
        return replyWithFallback(ctx, result.responseMessage || "Держи ссылку:", 
            Markup.inlineKeyboard([Markup.button.webApp('🚀 Открыть приложение', WEBAPP_URL)])
        );
    } else if (['create_event', 'create_transaction', 'create_task', 'create_note'].includes(result.action)) {
        const id = Math.random().toString(36).substr(2, 9);
        if (result.action === 'create_event') user.events.push({ ...result.data, id, completed: false });
        else if (result.action === 'create_transaction') user.transactions.push({ ...result.data, id });
        else if (result.action === 'create_task') user.todos.push({ ...result.data, id, createdAt: Date.now(), completed: false });
        else if (result.action === 'create_note') user.notes.push({ ...result.data, id, createdAt: Date.now() });
        saveDb(db);
        return replyWithFallback(ctx, result.responseMessage);
    } else {
        return replyWithFallback(ctx, result.responseMessage || 'Что-то я не поняла.');
    }
  } catch (e) {
    console.error(e);
    await ctx.reply('⚠️ Ошибка.');
  }
});

bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));