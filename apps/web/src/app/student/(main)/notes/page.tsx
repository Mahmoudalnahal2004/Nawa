'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, NotepadText, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Note {
  id: number;
  question_id: number;
  content: string;
  created_at: string;
  updated_at: string;
  question_text: string;
}

export default function MyNotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const { data } = await api.get('/notes?limit=100'); // simple large limit for now
      setNotes(data.items);
    } catch (err) {
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (id: number) => {
    setDeletingId(id);
    try {
      await api.delete(`/notes/${id}`);
      setNotes(prev => prev.filter(note => note.id !== id));
      toast.success('Note deleted successfully');
    } catch (err) {
      toast.error('Failed to delete note');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-32">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <NotepadText className="w-8 h-8 text-blue-400" />
            My Notes
          </h1>
          <p className="text-gray-400 mt-2">
            Review all the notes you've taken across different questions.
          </p>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
            <NotepadText className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No notes yet</h3>
          <p className="text-gray-400 mb-6">
            When you take notes on questions during a quiz, they will appear here.
          </p>
          <button 
            onClick={() => router.push('/student/dashboard')}
            className="btn-primary"
          >
            Start a Quiz
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map(note => (
            <div key={note.id} className="glass-card flex flex-col relative group overflow-hidden transition-all hover:border-blue-500/30">
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-3 gap-4">
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                    {note.question_text}
                  </p>
                  <button 
                    onClick={() => deleteNote(note.id)}
                    disabled={deletingId === note.id}
                    className="p-1.5 text-gray-500 hover:text-rose-400 bg-white/5 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
                    title="Delete Note"
                  >
                    {deletingId === note.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
                
                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-3" />
                
                <div className="mt-2 text-gray-200 text-sm whitespace-pre-wrap leading-relaxed flex-1">
                  {note.content}
                </div>
              </div>
              <div className="px-5 py-3 bg-white/[0.02] border-t border-white/5 text-xs text-gray-500 flex justify-between">
                <span>{new Date(note.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
