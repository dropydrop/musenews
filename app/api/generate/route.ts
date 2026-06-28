import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { rawInput } = await request.json();

    if (!rawInput?.trim()) {
      return NextResponse.json({ error: "Insère d'abord du texte !" }, { status: 400 });
    }

    const prompt = `Reprends ce résumé brut de buzz France X (dernières 24h/48h selon contexte).

Texte brut : ${rawInput}

RÈGLES STRICTES DE FORMATAGE (très important) :

- Commence exactement par : "Bonsoir à tous, voici le coeur de l'actualité récente en France ! 🔥"
- Style pote sarcastique français décontracté (ouais, putain, ça part en couille, etc.)
- **Beaucoup d'aération** : un saut de ligne entre chaque phrase importante, paragraphes courts (max 5-6 lignes)
- Utilise des sauts de ligne doubles entre les grandes sections
- Mets des --- seulement quand c'est une vraie séparation forte
- Liens en Markdown : [texte descriptif](https://x.com/...)
- Structure idéale :
  1. Intro punchy
  2. Top 1-2-3
  3. Highlights (4-5 points avec emojis)
  4. WTF du jour
  5. Punchline finale + question
- Longueur max ~750 mots

Réponds UNIQUEMENT avec le texte du résumé, rien d'autre.`;

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

    return NextResponse.json({ success: true, summary: data.choices[0].message.content });
  } catch (error: any) {
    console.error("Mistral API Error:", error);
    return NextResponse.json({ 
      error: error.message || "Erreur lors de la génération du résumé" 
    }, { status: 500 });
  }
}