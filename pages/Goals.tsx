import React, { useState, useEffect } from 'react';
import { db } from '../services/dbService';
import { Goal } from '../types';
import { Target, Check, Plus, Trash2 } from 'lucide-react';

const Goals: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoal, setNewGoal] = useState('');

  const fetchGoals = async () => {
    const data = await db.getGoals();
    setGoals(data);
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const addGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.trim()) return;
    await db.addGoal(newGoal);
    setNewGoal('');
    fetchGoals();
  };

  const toggleGoal = async (id: string) => {
    await db.toggleGoal(id);
    fetchGoals();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(confirm('Удалить цель?')) {
        await db.deleteGoal(id);
        fetchGoals();
    }
  };

  return (
    <div className="pb-24">
      <h1 className="text-2xl font-bold text-white mb-6">Цели</h1>

      <form onSubmit={addGoal} className="relative mb-8">
        <input 
          type="text" 
          value={newGoal}
          onChange={(e) => setNewGoal(e.target.value)}
          placeholder="Новая цель..."
          className="w-full bg-surface border border-zinc-700 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-1 focus:ring-white"
        />
        <Target className="absolute left-4 top-4 text-secondary" size={20} />
        <button type="submit" className="absolute right-2 top-2 bottom-2 bg-white text-black px-4 rounded-lg">
          Добавить
        </button>
      </form>

      <div className="grid grid-cols-1 gap-4">
        {goals.map(goal => (
          <div 
            key={goal.id} 
            onClick={() => toggleGoal(goal.id)}
            className={`p-5 rounded-xl border cursor-pointer transition-all group ${
              goal.completed 
                ? 'bg-zinc-900 border-zinc-800 opacity-60' 
                : 'bg-surface border-zinc-700 hover:border-zinc-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-lg font-medium ${goal.completed ? 'text-secondary line-through' : 'text-white'}`}>
                {goal.title}
              </span>
              
              <div className="flex items-center gap-3">
                <button onClick={(e) => handleDelete(e, goal.id)} className="text-zinc-600 hover:text-red-400">
                    <Trash2 size={18} />
                </button>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                    goal.completed ? 'bg-white border-white' : 'border-zinc-500'
                }`}>
                    {goal.completed && <Check size={14} className="text-black" />}
                </div>
              </div>
            </div>
            <div className="mt-2 text-xs text-secondary">
              {goal.completed ? 'Достигнуто' : 'В процессе'}
            </div>
          </div>
        ))}
        {goals.length === 0 && <div className="text-center text-secondary py-10">Целей пока нет.</div>}
      </div>
    </div>
  );
};

export default Goals;