import React from 'react';
import { LayoutDashboard, CheckSquare, Wallet, StickyNote, Calendar, Target } from 'lucide-react';
import { ViewState } from '../types';

interface NavigationProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, setView }) => {
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Главная' },
    { id: 'todos', icon: CheckSquare, label: 'Задачи' },
    { id: 'planner', icon: Calendar, label: 'Планер' },
    { id: 'budget', icon: Wallet, label: 'Бюджет' },
    { id: 'goals', icon: Target, label: 'Цели' },
    { id: 'notes', icon: StickyNote, label: 'Заметки' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-zinc-700 pb-6 pt-2 px-2 z-50">
      <div className="flex justify-between items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id as ViewState)}
              className={`flex flex-col items-center p-2 transition-colors ${
                isActive ? 'text-accent' : 'text-secondary'
              }`}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Navigation;