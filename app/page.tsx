'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2, RefreshCw, Sparkles, Trash2 } from 'lucide-react';

export default function XFree() {
  const [trends, setTrends] = useState('Chargement des trends...');
  const [rawInput, setRawInput] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const TODAY = new Date().toLocaleDateString('fr-FR');
  const RATE_LIMIT_MS = 3600000; // 1 heure

  useEffect(() => {
    fetch('/api/trends')
      .then(r => r.json())
      .then(data => setTrends(data.trends))
      .catch(() => setTrends('Erreur de chargement des trends.'));

    const cached = localStorage.getItem('xfree_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.date === TODAY) {
        setResult(parsed.summary);
      } else {
        localStorage.removeItem('xfree_cache');
      }
    }
  }, [TODAY]);

  const handleGenerate = async (isRegeneration = false) => {
    if (!rawInput.trim()) return setError("Insère d'abord du texte !");

    if (!isRegeneration) {
      const lastCall = localStorage.getItem('xfree_last_call');
      if (lastCall && Date.now() - parseInt(lastCall) < RATE_LIMIT_MS) {
        const minutesLeft = Math.ceil((RATE_LIMIT_MS - (Date.now() - parseInt(lastCall))) / 60000);
        return setError(`⏳ Bloqué pour ${minutesLeft} minutes (quota Groq).`);
      }
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResult(data.result);
      localStorage.setItem('xfree_last_call', Date.now().toString());
      localStorage.setItem('xfree_cache', JSON.stringify({ date: TODAY, summary: data.result }));
    } catch (err: any) {
      setError(`Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setRawInput('');
    setResult(null);
    setError(null);
    localStorage.removeItem('xfree_cache');
    localStorage.removeItem('xfree_last_call');
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-10">
        <header className="text-center">
          <h1 className="text-5xl font-black tracking-tighter flex items-center justify-center gap-3">
            🔥 X-Free
          </h1>
          <p className="text-xl text-gray-400 mt-2">Buzz France • Sarcasme inclus • {TODAY}</p>
        </header>

        <section className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">📈 Tendances France</h2>
          <pre className="whitespace-pre-wrap text-sm text-gray-300 bg-black/50 p-5 rounded-xl font-mono leading-relaxed">
            {trends}
          </pre>
        </section>

        <section className="space-y-6">
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="Colle ici le texte brut (trends + news du jour)..."
            className="w-full h-40 p-5 rounded-2xl bg-gray-900 border border-gray-700 focus:border-gray-500 focus:ring-0 resize-none text-gray-200 placeholder:text-gray-500"
          />

          {error && (
            <div className="bg-red-950 border border-red-800 text-red-400 p-4 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => handleGenerate(false)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-white text-black font-medium py-4 rounded-2xl hover:bg-gray-200 transition disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
              Générer le résumé
            </button>

            <button
              onClick={() => handleGenerate(true)}
              disabled={loading || !rawInput.trim()}
              className="flex items-center justify-center gap-2 border border-gray-700 hover:bg-gray-900 py-4 px-8 rounded-2xl transition disabled:opacity-50"
            >
              <RefreshCw size={20} /> Regénérer
            </button>

            <button
              onClick={handleClear}
              className="flex items-center justify-center gap-2 border border-red-800 text-red-400 hover:bg-red-950 py-4 px-8 rounded-2xl transition"
            >
              <Trash2 size={20} /> Effacer
            </button>
          </div>
        </section>

        {result && (
          <section className="bg-gray-900 p-8 rounded-3xl border border-gray-800 prose prose-invert max-w-none">
            <h3 className="text-2xl font-bold mb-6">Résultat final ⬇️</h3>
            <ReactMarkdown className="leading-relaxed text-gray-200">
              {result}
            </ReactMarkdown>
          </section>
        )}
      </div>
    </main>
  );
}