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
  const RATE_LIMIT_MS = 3600000;

  useEffect(() => {
    fetch('/api/trends')
      .then(r => r.json())
      .then(data => setTrends(data.trends))
      .catch(() => setTrends('Erreur de chargement des trends.'));

    const cached = localStorage.getItem('xfree_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.date === TODAY) setResult(parsed.summary);
    }
  }, [TODAY]);

  const handleGenerate = async (isRegeneration = false) => {
    if (!rawInput.trim()) return setError("Insère d'abord du texte !");

    if (!isRegeneration) {
      const lastCall = localStorage.getItem('xfree_last_call');
      if (lastCall && Date.now() - parseInt(lastCall) < RATE_LIMIT_MS) {
        const minutesLeft = Math.ceil((RATE_LIMIT_MS - (Date.now() - parseInt(lastCall))) / 60000);
        return setError(`⏳ Bloqué pour ${minutesLeft} minutes.`);
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
          <h1 className="text-5xl font-black tracking-tighter">🔥 MuseNews</h1>
          <p className="text-xl text-gray-400 mt-2">Buzz France sarcastique • {TODAY}</p>
        </header>

        <section className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
          <h2 className="text-xl font-bold mb-4">📈 Tendances France</h2>
          <pre className="whitespace-pre-wrap text-sm text-gray-300 bg-black/50 p-5 rounded-xl font-mono">
            {trends}
          </pre>
        </section>

        <section className="space-y-6">
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="Colle ici le texte brut des news/trends..."
            className="w-full h-40 p-5 rounded-2xl bg-gray-900 border border-gray-700 focus:border-gray-500 text-gray-200 resize-none"
          />

          {error && <div className="bg-red-950 border border-red-800 text-red-400 p-4 rounded-xl">{error}</div>}

          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => handleGenerate(false)} 
              disabled={loading} 
              className="flex-1 bg-white text-black py-4 rounded-2xl font-medium flex items-center justify-center gap-2 hover:bg-gray-200 disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
              Générer le résumé
            </button>
            <button 
              onClick={() => handleGenerate(true)} 
              disabled={loading || !rawInput.trim()} 
              className="border border-gray-700 py-4 px-8 rounded-2xl flex items-center gap-2 hover:bg-gray-900"
            >
              <RefreshCw size={20} /> Regénérer
            </button>
            <button 
              onClick={handleClear} 
              className="border border-red-800 text-red-400 py-4 px-8 rounded-2xl flex items-center gap-2 hover:bg-red-950"
            >
              <Trash2 size={20} /> Effacer
            </button>
          </div>
        </section>

        {result && (
          <section className="bg-gray-900 p-8 rounded-3xl border border-gray-800 prose prose-invert max-w-none">
            <h3 className="text-2xl font-bold mb-6">Résultat final ⬇️</h3>
            <div className="leading-relaxed text-gray-200 prose-invert">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}