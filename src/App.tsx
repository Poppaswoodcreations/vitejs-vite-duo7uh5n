import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';
import { Eye, EyeOff, Calendar, Clock, Trash2 } from 'lucide-react';

interface JournalEntry {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentEntry, setCurrentEntry] = useState('');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) {
        loadEntries();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadEntries();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (err) {
      console.error('Error loading entries:', err);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setAuthError('Check your email for the confirmation link!');
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setEntries([]);
    setCurrentEntry('');
  };

  const handleSaveEntry = async () => {
    if (!session?.user) {
      setError('You must be logged in to save entries');
      return;
    }

    if (!currentEntry.trim()) {
      setError('Entry cannot be empty');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !currentSession) {
        throw new Error('Session expired. Please log in again.');
      }

      const { error } = await supabase
        .from('journal_entries')
        .insert([
          {
            user_id: currentSession.user.id,
            content: currentEntry,
            created_at: new Date().toISOString(),
          }
        ]);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      setCurrentEntry('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      loadEntries();
    } catch (err) {
      console.error('Error saving entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-purple-600 text-xl">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Daily Journal
            </h1>
            <p className="text-gray-600">Your private space for reflection</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 rounded-lg transition-colors"
            >
              {isLogin ? 'Sign In' : 'Sign Up'}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setAuthError(null);
              }}
              className="w-full text-purple-600 hover:text-purple-700 text-sm"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-4xl mx-auto p-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">My Journal</h1>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-purple-600 hover:text-purple-700 font-medium"
          >
            Sign Out
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            New Entry
          </h2>
          <textarea
            value={currentEntry}
            onChange={(e) => setCurrentEntry(e.target.value)}
            placeholder="What's on your mind today?"
            className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          />

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {showSuccess && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
              Entry saved successfully!
            </div>
          )}

          <button
            onClick={handleSaveEntry}
            disabled={saving || !currentEntry.trim()}
            className="mt-4 w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-medium py-3 rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Save Entry'}
          </button>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-800">Past Entries</h2>
          {entries.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center text-gray-500">
              No entries yet. Start writing!
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar size={16} />
                      {formatDate(entry.created_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={16} />
                      {formatTime(entry.created_at)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {entry.content}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
