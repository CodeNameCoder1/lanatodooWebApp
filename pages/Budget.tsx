import React, { useState, useEffect } from 'react';
import { db } from '../services/dbService';
import { processQuickCommand } from '../services/geminiService';
import { Transaction } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Loader2, Plus, ArrowUpCircle, ArrowDownCircle, Wallet, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, subMonths, addMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ru } from 'date-fns/locale';

const Budget: React.FC = () => {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Date Navigation State
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchTransactions = async () => {
    const data = await db.getTransactions();
    // Keep all data in memory, filter locally
    setAllTransactions(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Filter transactions when currentDate or allTransactions change
  useEffect(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);

    const filtered = allTransactions.filter(tx => {
      const txDate = new Date(tx.date);
      return isWithinInterval(txDate, { start, end });
    });
    setFilteredTransactions(filtered);
  }, [currentDate, allTransactions]);

  const handleAiInput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsProcessing(true);
    try {
      const result = await processQuickCommand(input, new Date().toISOString());

      if (result.action === 'create_transaction' && result.data) {
        await db.addTransaction({
          amount: result.data.amount || 0,
          category: result.data.category || 'Разное',
          description: result.data.title || result.data.description || input,
          date: result.data.date || new Date().toISOString(),
          type: (result.data.type === 'expense' || result.data.type === 'income') ? result.data.type : 'expense'
        });
        setInput('');
        fetchTransactions(); // Reload all
      } else {
        alert(result.responseMessage || "Не удалось распознать транзакцию.");
      }
    } catch (err) {
      console.error(err);
      alert("Ошибка при добавлении.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Удалить запись?")) {
      await db.deleteTransaction(id);
      fetchTransactions();
    }
  };

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // --- CHART & TOTALS CALCULATION (Based on Filtered Data) ---

  const chartData = filteredTransactions.reduce((acc, curr) => {
    if (curr.type === 'expense') {
      const existing = acc.find(i => i.name === curr.category);
      if (existing) {
        existing.value += curr.amount;
      } else {
        acc.push({ name: curr.category, value: curr.amount });
      }
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const COLORS = ['#e4e4e7', '#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#27272a'];

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  return (
    <div className="pb-24">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-white">Бюджет</h1>
        
        {/* Date Controls */}
        <div className="flex items-center gap-2 bg-surface p-1 rounded-lg border border-zinc-700">
            <button onClick={handlePrevMonth} className="p-1 hover:text-white text-secondary">
                <ChevronLeft size={18} />
            </button>
            <span className="text-xs font-medium w-24 text-center">
                {format(currentDate, 'LLLL yyyy', { locale: ru })}
            </span>
            <button onClick={handleNextMonth} className="p-1 hover:text-white text-secondary">
                <ChevronRight size={18} />
            </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 mb-6">
         <div className="bg-surface p-3 rounded-xl border border-zinc-700 flex flex-col items-center justify-center">
            <span className="text-[10px] text-secondary uppercase mb-1">Доход</span>
            <div className="text-green-400 font-bold text-sm flex items-center gap-1">
               <ArrowUpCircle size={12} /> {totalIncome}
            </div>
         </div>
         <div className="bg-surface p-3 rounded-xl border border-zinc-700 flex flex-col items-center justify-center">
            <span className="text-[10px] text-secondary uppercase mb-1">Расход</span>
            <div className="text-white font-bold text-sm flex items-center gap-1">
               <ArrowDownCircle size={12} /> {totalExpense}
            </div>
         </div>
         <div className="bg-surface p-3 rounded-xl border border-zinc-700 flex flex-col items-center justify-center">
            <span className="text-[10px] text-secondary uppercase mb-1">Баланс</span>
            <div className={`font-bold text-sm flex items-center gap-1 ${balance >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
               <Wallet size={12} /> {balance}
            </div>
         </div>
      </div>

      {/* AI Input */}
      <div className="bg-surface p-4 rounded-xl border border-zinc-700 mb-6">
        <form onSubmit={handleAiInput} className="flex gap-2">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder='Например: "Получил зп 50000"'
            className="flex-1 bg-background border-none rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-white"
            disabled={isProcessing}
          />
          <button 
            type="submit" 
            disabled={isProcessing}
            className="bg-white text-black p-2 rounded-lg"
          >
            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          </button>
        </form>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <div className="h-48 w-full mb-6 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <span className="text-[10px] text-secondary block">Расходы</span>
              <span className="text-lg font-bold text-white">{totalExpense}</span>
          </div>
        </div>
      ) : (
        <div className="text-center text-secondary text-xs mb-6 h-48 flex items-center justify-center border border-dashed border-zinc-800 rounded-xl">
          Нет данных по расходам за этот месяц
        </div>
      )}

      {/* List */}
      <h3 className="text-lg font-semibold text-white mb-3 mt-4">
          История ({format(currentDate, 'LLL', { locale: ru })})
      </h3>
      <div className="space-y-3">
        {filteredTransactions.map(tx => (
          <div key={tx.id} className="group flex justify-between items-center bg-surface p-3 rounded-lg border border-zinc-700">
            <div>
              <p className="font-medium text-white">{tx.description}</p>
              <p className="text-xs text-secondary">{tx.category} • {new Date(tx.date).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-3">
                <div className={`font-bold ${tx.type === 'expense' ? 'text-white' : 'text-green-400'}`}>
                  {tx.type === 'expense' ? '-' : '+'}{tx.amount}
                </div>
                <button 
                  onClick={() => handleDelete(tx.id)}
                  className="text-zinc-600 hover:text-red-400"
                >
                    <Trash2 size={16} />
                </button>
            </div>
          </div>
        ))}
        {filteredTransactions.length === 0 && <p className="text-secondary text-center text-sm">Транзакции не найдены.</p>}
      </div>
    </div>
  );
};

export default Budget;