import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { rawInput } = await request.json();

    if (!rawInput?.trim()) {
      return NextResponse.json({ error: "Insère d'abord du texte !" }, { status: 400 });
    }

    const prompt = `Reprends ce résumé brut de buzz France X (dernières 24h/48h selon contexte).

Texte brut : ${rawInput}

Règles strictes :
- Commence par : "Bonsoir à tous, voilà le buzz France des dernières XXh qui a tout fait péter sur X ! 🔥"
- Style pote décontracté français sarcastique (ouais, putain, ça part en couille, vannes naturelles)
- Structure générale : Top de l'actualité brulante + highlights variés + WTF du jour + punchline finale de conclusion. Structure claire avec beaucoup d'aération : sauts de ligne entre chaque idée et paragraphe, paragraphes courts
- Mets les liens de tweets en Markdown cliquables : [description](https://x.com/...)
- Utilise des sauts de ligne pour séparer les sections
- Longueur max ~650 mots
- Réponds UNIQUEMENT avec le résumé final.`;

    const mistralRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        temperature: 0.85,
        max_tokens: 1400,
        messages: [
          { 
            role: "system", 
            content: "Tu es une pote française ultra sarcastique, fun et décontractée qui fait des résumés buzz X France. Style oral réaliste, vannes incisives qui piquent juste ce qu'il faut." 
          },
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await mistralRes.json();

    if (!mistralRes.ok) {
      throw new Error(data.error?.message || `Mistral error: ${mistralRes.status}`);
    }

    return NextResponse.json({ result: data.choices[0].message.content });
  } catch (error: any) {
    console.error("Mistral API Error:", error);
    return NextResponse.json({ 
      error: error.message || "Erreur lors de la génération du résumé" 
    }, { status: 500 });
  }
}