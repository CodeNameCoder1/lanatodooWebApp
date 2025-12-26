import React, { useState, useEffect } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { processQuickCommand, generateAnalyticsTip } from '../services/geminiService';
import { db } from '../services/dbService';
import { Todo, PlanEvent } from '../types';

interface DashboardProps {
  refreshData: () => void;
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ refreshData }) => {
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiTip, setAiTip] = useState('Анализирую ваш день...');
  const [stats, setStats] = useState({ todoCount: 0, nextEvent: '' });
  
  // User state with default fallback
  const [user, setUser] = useState<{name: string, initials: string, photoUrl?: string}>({
    name: 'Пользователь',
    initials: 'YOU'
  });

  useEffect(() => {
    // Load Telegram User Data
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      if (tg.initDataUnsafe?.user) {
        const tgUser = tg.initDataUnsafe.user as TelegramUser;
        setUser({
          name: tgUser.first_name,
          initials: tgUser.first_name.slice(0, 2).toUpperCase(),
          photoUrl: tgUser.photo_url
        });
      }
    }
    
    loadStats();
  }, []);

  const loadStats = async () => {
    const todos = await db.getTodos();
    const events = await db.getEvents();
    
    // Simple logic to find next upcoming event
    const now = new Date();
    const upcoming = events
      .filter(e => new Date(e.date) > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

    const openTodos = todos.filter(t => !t.completed).length;

    setStats({
      todoCount: openTodos,
      nextEvent: upcoming ? `${upcoming.title} в ${new Date(upcoming.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Нет предстоящих событий'
    });

    // Generate AI Tip
    const summary = `User has ${openTodos} pending tasks. Next event is ${upcoming ? upcoming.title : 'none'}.`;
    generateAnalyticsTip(summary).then(setAiTip);
  };

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    setIsProcessing(true);
    try {
      const result = await processQuickCommand(command, new Date().toISOString());
      
      switch (result.action) {
        case 'create_task':
          await db.addTodo({
            title: result.data.title || 'Новая задача',
            priority: result.data.priority || 'Medium',
            completed: false,
            description: result.data.description
          });
          break;
        case 'create_event':
          await db.addEvent({
            title: result.data.title || 'Новое событие',
            date: result.data.date || new Date().toISOString()
          });
          break;
        case 'create_transaction':
           // Normalize type to ensure it matches 'expense' | 'income'
          const txType = (result.data.type && result.data.type.toLowerCase() === 'income') ? 'income' : 'expense';
          await db.addTransaction({
            amount: result.data.amount || 0,
            category: result.data.category || 'Общее',
            description: result.data.description || 'Быстрый расход',
            date: result.data.date || new Date().toISOString(),
            type: txType
          });
          break;
        case 'create_note':
          await db.addNote(result.data.content || command);
          break;
      }
      
      setCommand('');
      refreshData();
      loadStats(); // Reload local stats
      alert(result.responseMessage); // Simple feedback
    } catch (error) {
      console.error(error);
      alert("Что-то пошло не так при обработке команды.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">LanaTodoo</h1>
          <p className="text-secondary text-sm">С возвращением, {user.name}</p>
        </div>
        <div className="h-10 w-10 bg-surface rounded-full flex items-center justify-center border border-zinc-700 overflow-hidden">
           {user.photoUrl ? (
             <img src={user.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
           ) : (
             <span className="font-bold text-accent">{user.initials}</span>
           )}
        </div>
      </header>

      {/* AI Insight Card */}
      <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 p-4 rounded-xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-2 opacity-10">
          <Sparkles size={64} />
        </div>
        <h3 className="text-accent font-medium flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-yellow-500" />
          Совет ассистента
        </h3>
        <p className="text-zinc-300 text-sm italic">"{aiTip}"</p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface p-4 rounded-xl border border-zinc-700">
          <p className="text-secondary text-xs uppercase tracking-wider">Ожидающие задачи</p>
          <p className="text-3xl font-bold text-white mt-1">{stats.todoCount}</p>
        </div>
        <div className="bg-surface p-4 rounded-xl border border-zinc-700">
          <p className="text-secondary text-xs uppercase tracking-wider">Следующее событие</p>
          <p className="text-sm font-semibold text-white mt-2 truncate">{stats.nextEvent}</p>
        </div>
      </div>

      {/* Quick Command Interface */}
      <div className="bg-surface p-5 rounded-xl border border-zinc-700">
        <label className="block text-sm font-medium text-secondary mb-3">
          Быстрая команда
        </label>
        <form onSubmit={handleCommandSubmit} className="relative">
          <textarea
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="например: 'Встреча с командой в пятницу в 19:00' или 'Потратил 1000 руб на такси'"
            className="w-full bg-background text-white rounded-lg p-3 pr-12 text-sm focus:ring-1 focus:ring-white focus:outline-none resize-none h-24 border border-zinc-700"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={!command || isProcessing}
            className="absolute bottom-3 right-3 p-2 bg-white text-black rounded-full hover:bg-zinc-200 disabled:opacity-50 transition-colors"
          >
            {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} />}
          </button>
        </form>
        <p className="text-[10px] text-zinc-500 mt-2">
          Работает на базе ИИ. Принимает задачи, расходы, события и заметки.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;