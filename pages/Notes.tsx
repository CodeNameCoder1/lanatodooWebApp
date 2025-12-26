import React, { useState, useEffect } from 'react';
import { db } from '../services/dbService';
import { Note } from '../types';
import { StickyNote, Plus, Trash2, X, Save } from 'lucide-react';

const Notes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentNoteContent, setCurrentNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const fetchNotes = async () => {
    const data = await db.getNotes();
    setNotes(data.sort((a, b) => b.createdAt - a.createdAt));
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleOpenNote = (note?: Note) => {
    if (note) {
      setEditingNoteId(note.id);
      setCurrentNoteContent(note.content);
    } else {
      setEditingNoteId(null);
      setCurrentNoteContent('');
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!currentNoteContent.trim()) {
      setIsEditing(false);
      return;
    }

    if (editingNoteId) {
      // Update existing
      await db.updateNote(editingNoteId, currentNoteContent);
    } else {
      // Create new
      await db.addNote(currentNoteContent);
    }
    
    setIsEditing(false);
    fetchNotes();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent opening the note when clicking delete
    if (confirm('Удалить заметку?')) {
      await db.deleteNote(id);
      if (editingNoteId === id) setIsEditing(false);
      fetchNotes();
    }
  };

  return (
    <div className="pb-24 relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Заметки</h1>
        <button 
          onClick={() => handleOpenNote()}
          className="bg-white text-black p-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-zinc-200 transition-colors"
        >
          <Plus size={16} /> Новая
        </button>
      </div>

      {/* Grid of Notes */}
      <div className="grid grid-cols-2 gap-4">
        {notes.map(note => (
          <div 
            key={note.id} 
            onClick={() => handleOpenNote(note)}
            className="bg-surface border border-zinc-700 p-4 rounded-xl flex flex-col h-40 cursor-pointer hover:border-zinc-500 transition-all group relative"
          >
            <div className="flex justify-between items-start mb-2">
              <StickyNote size={16} className="text-secondary" />
              <button 
                onClick={(e) => handleDelete(e, note.id)}
                className="text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
              >
                <Trash2 size={14} />
              </button>
            </div>
            
            <p className="text-sm text-zinc-300 overflow-hidden line-clamp-4 flex-1 whitespace-pre-wrap">
              {note.content}
            </p>
            <p className="text-[10px] text-zinc-500 mt-2 text-right">
              {new Date(note.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
        {notes.length === 0 && (
           <div className="col-span-2 text-center text-secondary py-10">Нет заметок.</div>
        )}
      </div>

      {/* Editor Overlay/Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-md rounded-2xl border border-zinc-700 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-zinc-700 flex justify-between items-center">
              <h3 className="font-semibold text-white">
                {editingNoteId ? 'Редактировать' : 'Новая заметка'}
              </h3>
              <button onClick={() => setIsEditing(false)} className="text-secondary hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <textarea
              autoFocus
              value={currentNoteContent}
              onChange={(e) => setCurrentNoteContent(e.target.value)}
              placeholder="Напишите что-нибудь..."
              className="w-full flex-1 bg-surface p-4 text-white focus:outline-none resize-none min-h-[200px]"
            />
            
            <div className="p-4 border-t border-zinc-700 flex justify-end gap-3">
              {editingNoteId && (
                <button 
                  onClick={(e) => handleDelete(e as any, editingNoteId)}
                  className="mr-auto text-red-400 hover:text-red-300 flex items-center gap-1 text-sm"
                >
                  <Trash2 size={16} /> Удалить
                </button>
              )}
              <button 
                onClick={() => setIsEditing(false)} 
                className="text-secondary hover:text-white px-4 py-2 text-sm"
              >
                Отмена
              </button>
              <button 
                onClick={handleSave} 
                className="bg-white text-black px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-zinc-200"
              >
                <Save size={16} /> Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notes;