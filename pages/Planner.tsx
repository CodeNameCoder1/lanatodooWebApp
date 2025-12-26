import React, { useState, useEffect } from 'react';
import { db } from '../services/dbService';
import { PlanEvent } from '../types';
import { Calendar as CalendarIcon, Clock, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const Planner: React.FC = () => {
  const [events, setEvents] = useState<PlanEvent[]>([]);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');

  const fetchEvents = async () => {
    const data = await db.getEvents();
    setEvents(data);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle || !newEventDate) return;

    await db.addEvent({
      title: newEventTitle,
      date: new Date(newEventDate).toISOString()
    });
    setNewEventTitle('');
    setNewEventDate('');
    fetchEvents();
  };

  const handleDelete = async (id: string) => {
    if(confirm('Удалить событие?')) {
        await db.deleteEvent(id);
        fetchEvents();
    }
  };

  return (
    <div className="pb-24">
      <h1 className="text-2xl font-bold text-white mb-6">Планер</h1>

      <form onSubmit={handleAddEvent} className="bg-surface p-4 rounded-xl border border-zinc-700 mb-6 space-y-3">
        <input 
          type="text"
          value={newEventTitle}
          onChange={e => setNewEventTitle(e.target.value)}
          placeholder="Название события"
          className="w-full bg-background rounded-lg px-3 py-2 text-white border border-zinc-700 focus:outline-none"
        />
        <div className="flex gap-2">
          <input 
            type="datetime-local"
            value={newEventDate}
            onChange={e => setNewEventDate(e.target.value)}
            className="flex-1 bg-background rounded-lg px-3 py-2 text-white border border-zinc-700 focus:outline-none text-xs"
          />
          <button type="submit" className="bg-white text-black px-4 rounded-lg flex items-center justify-center">
            <Plus size={20} />
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {events.map((event) => {
          const dateObj = new Date(event.date);
          const day = format(dateObj, 'dd');
          const month = format(dateObj, 'MMM', { locale: ru });
          const time = format(dateObj, 'HH:mm');

          return (
            <div key={event.id} className="flex gap-4 group">
              <div className="flex flex-col items-center justify-center bg-surface w-16 h-16 rounded-xl border border-zinc-700 shrink-0">
                <span className="text-xs text-secondary font-medium uppercase">{month}</span>
                <span className="text-xl font-bold text-white">{day}</span>
              </div>
              <div className="flex-1 bg-surface rounded-xl border border-zinc-700 p-3 flex justify-between items-center">
                <div>
                    <h4 className="font-semibold text-white">{event.title}</h4>
                    <div className="flex items-center gap-1 text-xs text-secondary mt-1">
                    <Clock size={12} />
                    <span>{time}</span>
                    </div>
                </div>
                <button onClick={() => handleDelete(event.id)} className="text-zinc-600 hover:text-red-400 p-2">
                    <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
        {events.length === 0 && <div className="text-center text-secondary py-10">Нет предстоящих планов.</div>}
      </div>
    </div>
  );
};

export default Planner;