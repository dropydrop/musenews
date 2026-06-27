import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { rawInput } = await request.json();

    if (!rawInput?.trim()) {
      return NextResponse.json({ error: "Insère d'abord du texte !" }, { status: 400 });
    }

    const prompt = `Reprends ce résumé brut de buzz France X (dernières 24h/48h/5 jours selon le contexte) copié depuis Trends24 ou Grok.

Texte brut : ${rawInput}

Règles strictes pour le résumé :
- Commence toujours par : "Bonsoir à tous, voilà le buzz France des dernières XXh qui a tout fait péter sur X ! 🔥"
- Style pote décontracté français : ouais, putain, ça part en couille, vannes sarcastiques naturelles
- Structure : Top 1-2 + 3-5 highlights variés + WTF du jour + punchline finale
- Ton incisif, fun, jamais trop trash
- Utilise Markdown + emojis
- Liens cliquables [texte](https://x.com/...)
- Longueur : 384-512 mots max
- Réponds UNIQUEMENT avec le texte final du résumé, rien d'autre.`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0.78,
        max_tokens: 1200,
        messages: [
          { 
            role: "system", 
            content: "Tu es une pote française sarcastique, fun et décontractée qui fait des résumés buzz X France. Style oral, incisif, avec des vannes qui piquent juste ce qu'il faut." 
          },
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await groqRes.json();
    
    if (!groqRes.ok) {
      throw new Error(data.error?.message || "Erreur Groq");
    }

    return NextResponse.json({ result: data.choices[0].message.content });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}