import { NextResponse } from 'next/server';
import { fetchTrendsData } from '../trends/route';

const SYSTEM_PROMPT = "Tu es une pote française ultra sarcastique, fun et décontractée qui fait des résumés d'infos buzz X France. Style oral réaliste, vannes incisives qui piquent juste ce qu'il faut.";

const PROMPT_INPUT_FILLED = (rawInput: string) => `Reprends ce résumé brut d'informations francophone.

Texte brut : ${rawInput}

RÈGLES STRICTES DE FORMATAGE (très important) :

- Commence exactement par : "Bonsoir à tous, voici le coeur de l'actualité récente en France ! 🔥"
- Style pote sarcastique français décontracté (ouais, putain, ça part en couille, etc.)
- Exemple de ton : "Alors déjà, qui a décidé que la France avait besoin d'UN SEPTIÈME rapport sur les retraites ? Posez vos pièces dans le chapeau."
- Au moins 3 vannes bien acides dans le résumé, n'aie pas peur du second degré
- Si un sujet est vraiment WTF, fais-en le plat principal
- Un émoji pertinent en début de chaque titre de section (intro, Top 1, Highlights, WTF, punchline)
- Équilibre harmonieusement les émojis sur l'ensemble du résumé
- Liens en Markdown : [texte descriptif](https://x.com/...)
- Structure idéale :
  1. Intro punchy
  2. Top 1-2-3
  3. Highlights (4-5 points avec emojis)
  4. WTF du jour
  5. Punchline finale + question
- **aération** : un retour a la ligne entre chaque phrase importante, paragraphes courts (max 5-6 lignes)
- Utilise des --- et un saut de ligne entre chaque grandes sections pour une vraie séparation
- Longueur max ~750 mots
- Si le texte brut contient des liens X, conserve-les avec leur texte descriptif
- Formate : [voir sur X](https://x.com/...)

Réponds UNIQUEMENT avec le texte du résumé, rien d'autre.`;

const PROMPT_EMPTY_INPUT = (fusedData: string) => `Tu joues le rôle d'un observateur média ultra-lucide et cynique. Filtre le bruit ambiant pour livrer uniquement l'essentiel du buzz francophone récent (X, reddit, actualités, tech, culture web, faits de société marquants).

Tu reçois des données brutes de tendances X et d'actualités web.

Données :
${fusedData}

Consignes de sélection :
- Exclus les faits divers locaux sans envergure (accidents routiers, météo banale, petits crimes locaux)
- Sélectionne uniquement ce qui génère une forte interaction émotionnelle, un débat sociétal, un pic d'innovation tech, ou un moment de pur absurde
- Si l'info manque de chair sur les gros sites, déduis-en l'essence en croisant les angles morts

RÈGLES STRICTES DE FORMATAGE :
- Commence exactement par : "Bonsoir à tous, voici le coeur de l'actualité récente en France ! 🔥"
- Style pote sarcastique français décontracté, incisif, sans politesses répétitives. Utilise l'argot français naturel.
- Exemple de ton : "Alors déjà, qui a décidé que la France avait besoin d'UN SEPTIÈME rapport sur les retraites ? Posez vos pièces dans le chapeau."
- Au moins 3 vannes bien acides dans le résumé, n'aie pas peur du second degré
- Si un sujet est vraiment WTF, fais-en le plat principal
- Un émoji pertinent en début de chaque titre de section (Top 1, Highlights, WTF, punchline)
- Équilibre harmonieusement les émojis sur l'ensemble du résumé
- Liens en Markdown : [texte descriptif](https://x.com/...)
- Pas d'intro lourde, pas de conclusion formelle
- Interdiction d'halluciner des faits. Si c'est calme, dis-le honnêtement.
- Structure idéale :
  1. Top 1 : L'info qui fait le plus de bruit. Résumé + vanne acide.
  2. Highlights (3-5 items) : Regroupe par thématiques (Tech/IA, Culture Web, Société)
  3. Le "WTF" du jour : L'absurdité la plus rageante ou drôle
  4. Punchline de fin : Une phrase courte qui claque
- **aération** : un retour à la ligne entre chaque phrase importante, paragraphes courts (max 5-6 lignes)
- Utilise des --- et un saut de ligne entre chaque grande section
- Longueur max ~750 mots
- Varie les sources citées dans le résumé (ne pas se focaliser sur 2-3 mêmes sites)
- Si des liens X sont présents dans les données, inclus-les en Markdown : [voir le post](https://x.com/...)
- Les sources X sont un complément qui ancre l'information, pas une source prioritaire

Réponds UNIQUEMENT avec le texte du résumé, rien d'autre.`;

async function callMistral(userPrompt: string) {
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.MISTRAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      temperature: 0.9,
      max_tokens: 1400,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ]
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Mistral error: ${res.status}`);
  return data.choices[0].message.content;
}

async function searchTavily(): Promise<string> {
  const queries = [
    "actualité France politique société économie débats",
    "tech France innovation IA start-up intelligence artificielle",
    "culture web France influenceurs tendances réseaux sociaux",
    "fait divers insolite France viral buzz"
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  const results = await Promise.all(
    queries.map(q =>
      fetch("https://api.tavily.com/search", {
        signal: controller.signal,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query: q,
          search_depth: "advanced",
          max_results: 5,
          include_domains: ["lemonde.fr", "liberation.fr", "lefigaro.fr", "bfmtv.com", "france24.com", "francetvinfo.fr", "20minutes.fr", "legorafi.fr", "x.com", "reddit.com"]
        })
      }).then(r => r.json())
    )
  );

  clearTimeout(timeout);

  const seen = new Set<string>();
  const items = results
    .flatMap((r: any) => r.results || [])
    .filter((item: any) => {
      if (!item.title || seen.has(item.title)) return false;
      seen.add(item.title);
      return item.title.length > 10 && (item.content?.length || 0) > 100;
    })
    .slice(0, 12);

  if (!items.length) return "Aucune actualité récente trouvée.";

  return items.map((item: any) => `${item.title}\n${item.content}`).join('\n\n---\n\n');
}

export async function POST(request: Request) {
  try {
    const { rawInput } = await request.json();
    const input = rawInput?.trim();

    if (input) {
      const summary = await callMistral(PROMPT_INPUT_FILLED(input));
      return NextResponse.json({ success: true, summary });
    }

    const [tavilyContent, trendsContent] = await Promise.all([
      searchTavily(),
      fetchTrendsData().catch(() => 'Aucune tendance disponible.')
    ]);

    const fusedData = `=== TENDANCES X (dernières 24h) ===\n${trendsContent}\n\n=== ACTUALITÉS DE LA SEMAINE ===\n${tavilyContent}\n\nNote : cherche ce qui est absurde, scandaleux ou drôle dans ces données. C'est ça le focus.`;

    const summary = await callMistral(PROMPT_EMPTY_INPUT(fusedData));
    return NextResponse.json({ success: true, summary });

  } catch (error: any) {
    console.error("Generate API Error:", error);
    return NextResponse.json({ 
      error: error.message || "Erreur lors de la génération du résumé" 
    }, { status: 500 });
  }
}
