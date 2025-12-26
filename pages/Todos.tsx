import React, { useState, useEffect } from 'react';
import { db } from '../services/dbService';
import { Todo, Priority } from '../types';
import { Plus, ChevronDown, ChevronUp, AlertCircle, Trash2 } from 'lucide-react';

const Todos: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<Priority>(Priority.MEDIUM);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchTodos = async () => {
    const data = await db.getTodos();
    setTodos(data.sort((a, b) => b.createdAt - a.createdAt));
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;
    await db.addTodo({
      title: newTodoTitle,
      priority: newTodoPriority,
      completed: false
    });
    setNewTodoTitle('');
    fetchTodos();
  };

  const toggleTodo = async (id: string) => {
    await db.toggleTodo(id);
    fetchTodos();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(confirm('Удалить задачу?')) {
        await db.deleteTodo(id);
        fetchTodos();
    }
  };

  const getPriorityColor = (p: Priority) => {
    switch (p) {
      case Priority.HIGH: return 'text-red-400';
      case Priority.MEDIUM: return 'text-yellow-400';
      case Priority.LOW: return 'text-green-400';
      default: return 'text-secondary';
    }
  };

  const getPriorityLabel = (p: Priority) => {
    switch (p) {
      case Priority.HIGH: return 'Высокий';
      case Priority.MEDIUM: return 'Средний';
      case Priority.LOW: return 'Низкий';
      default: return p;
    }
  };

  return (
    <div className="pb-24">
      <h1 className="text-2xl font-bold text-white mb-6">Задачи</h1>

      <form onSubmit={handleAddTodo} className="mb-6 flex gap-2">
        <input 
          type="text" 
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
          placeholder="Новая задача..."
          className="flex-1 bg-surface border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none"
        />
        <select 
          value={newTodoPriority}
          onChange={(e) => setNewTodoPriority(e.target.value as Priority)}
          className="bg-surface border border-zinc-700 rounded-lg px-2 text-sm text-secondary focus:outline-none"
        >
          <option value={Priority.HIGH}>Выс</option>
          <option value={Priority.MEDIUM}>Срд</option>
          <option value={Priority.LOW}>Низ</option>
        </select>
        <button type="submit" className="bg-white text-black rounded-lg w-12 flex items-center justify-center">
          <Plus size={20} />
        </button>
      </form>

      <div className="space-y-3">
        {todos.map(todo => (
          <div key={todo.id} className="bg-surface border border-zinc-700 rounded-xl overflow-hidden group">
            <div className="flex items-center p-4">
              <button 
                onClick={() => toggleTodo(todo.id)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 transition-colors ${todo.completed ? 'bg-zinc-600 border-zinc-600' : 'border-zinc-500'}`}
              >
                {todo.completed && <div className="w-2 h-2 bg-white rounded-full" />}
              </button>
              
              <div className="flex-1 cursor-pointer" onClick={() => setExpandedId(expandedId === todo.id ? null : todo.id)}>
                <p className={`font-medium ${todo.completed ? 'text-secondary line-through' : 'text-white'}`}>
                  {todo.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                   <AlertCircle size={12} className={getPriorityColor(todo.priority)} />
                   <span className={`text-xs ${getPriorityColor(todo.priority)}`}>{getPriorityLabel(todo.priority)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                  <button onClick={(e) => handleDelete(e, todo.id)} className="text-zinc-600 hover:text-red-400 p-2">
                    <Trash2 size={18} />
                  </button>
                  {todo.description && (
                    <button onClick={() => setExpandedId(expandedId === todo.id ? null : todo.id)} className="text-secondary p-2">
                      {expandedId === todo.id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                    </button>
                  )}
              </div>
            </div>
            
            {expandedId === todo.id && todo.description && (
              <div className="bg-background/50 p-4 border-t border-zinc-700 text-sm text-zinc-300">
                {todo.description}
              </div>
            )}
          </div>
        ))}

        {todos.length === 0 && (
          <div className="text-center text-secondary py-10">Задач пока нет. Хорошего дня!</div>
        )}
      </div>
    </div>
  );
};

export default Todos;