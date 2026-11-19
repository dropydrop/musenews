import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { fetchTrendsData } from '../trends/route';

// Configuration Vercel : augmente le timeout max à 30 secondes pour les fonctions serverless
export const maxDuration = 30;

interface CandidateArticle {
  title: string;
  source: string;
  snippet: string;
  url?: string;
  pubDate?: Date;
}

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

const PROMPT_EMPTY_INPUT = (fusedData: string) => `Tu joues le rôle d'un observateur média et culture web ultra-lucide, sec et cynique.
Ton but : extraire la substantifique moelle de ce qui fait parler sur les réseaux francophones et le web aujourd'hui.

Données collectées (tendances X/Google + revue de presse web/RSS) :
${fusedData}

ENCADREMENT STRICT DES TENDANCES :
- Les "Tendances X / Google" listées ci-dessus sont des signaux bruts et des mots-clés de recherche, PAS des faits vérifiés.
- INTERDICTION FORMELLE d'inventer la raison de la popularité d'une tendance si celle-ci n'est pas expliquée dans les articles web fournis.
- Une tendance isolée NE SUFFIT PAS à construire un sujet : elle doit être corroborée par des faits tangibles issus des articles collectés.
- Si une tendance n'est pas corroborée ou expliquée par les articles fournis, IGNORE-LA purement et simplement.

CRITÈRES STRICTS DE SÉLECTION ÉDITORIALE :
- À ÉCARTER TOTALEMENT :
  * La politique politicienne institutionnelle de routine (débats d'appareil, commissions, budget austère)
  * Les résultats sportifs ordinaires
  * L'économie macro-économique d'entreprise conventionnelle
  * Les faits divers sordides ou morbides sans intérêt sociétal

- À PRIVILÉGIER ABSOLUMENT :
  * Culture Internet, mèmes, dérives d'influenceurs, streamers, dramas et phénomènes numériques
  * Controverses et polémiques absurdes sur les réseaux sociaux (ce qui a fait réagir ou clasher)
  * Comportements collectifs bizarres, tendances insolites et faits révélateurs de l'époque
  * Les vrais moments de WTF et d'absurde

RÈGLES DE FORMATAGE :
- Commence exactement par : "Bonsoir à tous, voici le coeur de l'actualité récente en France ! 🔥"
- Style : pote sarcastique français décontracté, incisif, piquant mais lucide. Pas de politesse académique.
- Sélectionne 4 à 5 sujets phares maximum parmi les données fournies.
- Structure idéale :
  1. Top 1 : L'info ou la polémique qui fait le plus de bruit ou de drama. Résumé + vanne bien acide.
  2. Highlights (3-4 points marquants) : Les autres pépites web/société avec emojis pertinents en titre.
  3. Le "WTF" du jour : L'absurdité la plus frappante ou lunaire.
  4. Punchline finale : Une phrase courte qui claque + une question ouverte piquante.
- Longueur cible : environ 750 mots.
- IMPÉRATIF DE COMPLÉTUDE : Le résumé doit impérativement être mené à son terme complet. Toutes les rubriques (Top 1, Highlights, WTF, Punchline finale avec question) doivent être rédigées jusqu'au bout. Si nécessaire, condense légèrement les développements intermédiaires pour garantir que le texte ne soit jamais interrompu au milieu d'une phrase.
- Liens en Markdown si disponibles dans les données (ex: [source](url)).
- Aération : retours à la ligne fréquents, paragraphes courts (max 4-5 lignes), séparateurs --- entre grandes sections.
- Reste fidèle aux faits : n'invente rien qui ne figure pas dans les données.

Réponds UNIQUEMENT avec le texte du résumé, rien d'autre.`;

// Appel Mistral avec AbortController explicite et paramètres configurables
async function callMistral(
  userPrompt: string, 
  temperature = 0.9, 
  timeoutMs = 20000,
  maxTokens = 1400
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const startMistral = Date.now();
  console.log(`[generate] Appel Mistral démarré (temp: ${temperature}, max_tokens: ${maxTokens}, timeout: ${timeoutMs / 1000}s)...`);

  try {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      signal: controller.signal,
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "ministral-8b-latest",
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ]
      })
    });

    clearTimeout(timer);
    const mistralDuration = Date.now() - startMistral;

    const data: any = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `Mistral error: ${res.status}`);

    const choice = data.choices?.[0];
    const content = choice?.message?.content || '';
    const finishReason = choice?.finish_reason || 'non_specifie';
    const usage = data.usage;

    console.log(`[generate] Réponse Mistral reçue en ${mistralDuration}ms :
  - Taille : ${content.length} car
  - Finish reason : ${finishReason}
  - Prompt tokens : ${usage?.prompt_tokens ?? 'N/A'}
  - Completion tokens : ${usage?.completion_tokens ?? 'N/A'}
  - Total tokens : ${usage?.total_tokens ?? 'N/A'}`);

    if (finishReason === 'length') {
      console.warn(`[generate] ATTENTION: La réponse a été tronquée par le plafond max_tokens (${maxTokens} tokens atteints).`);
    }

    return content;
  } catch (err: any) {
    clearTimeout(timer);
    const elapsed = Date.now() - startMistral;
    if (err.name === 'AbortError') {
      console.error(`[generate] Timeout Mistral après ${elapsed}ms (seuil: ${timeoutMs}ms)`);
      throw new Error(`Délai de réponse dépassé pour la génération IA (timeout ${timeoutMs / 1000}s - écoulé: ${elapsed}ms).`);
    }
    throw err;
  }
}

// Validation temporelle stricte : écarte les articles plus vieux que 36 heures
function parseAndValidateDate(rawDate?: string, maxHoursAgo = 36): Date | null {
  if (!rawDate) return null;
  const parsed = new Date(rawDate);
  const time = parsed.getTime();
  if (isNaN(time)) return null;

  const now = Date.now();
  const maxAgeMs = maxHoursAgo * 3600 * 1000;
  // Écarte si plus vieux que 36h ou si antidaté/futuriste (> 1h dans le futur)
  if (now - time > maxAgeMs || time - now > 3600 * 1000) {
    return null;
  }
  return parsed;
}

// Nettoyage et décodage HTML des descriptions
function cleanHtmlText(rawHtml?: string, maxLength = 200): string {
  if (!rawHtml) return '';
  const $ = cheerio.load(rawHtml);
  return $.text().replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

// Normalisation des URLs (retire les paramètres de tracking connus)
function normalizeUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  try {
    const u = new URL(rawUrl);
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'oc'];
    for (const p of trackingParams) {
      u.searchParams.delete(p);
    }
    return (u.origin + u.pathname.replace(/\/$/, '') + (u.search ? u.search : '')).toLowerCase();
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

// Normalisation complète des titres pour comparaison fine
function normalizeTitle(rawTitle: string): string {
  return rawTitle
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Supprime accents
    .replace(/[-–|].*$/, '') // Supprime suffixe de média ("- Le Monde", "| Next.ink")
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // Conserve lettres et chiffres
    .replace(/\s+/g, ' ')
    .trim();
}

// 1. Tavily : 1 seule requête ciblée
async function searchTavily(): Promise<CandidateArticle[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || apiKey.includes('ta_clé') || apiKey.includes('ta_cle')) {
    return [];
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const res = await fetch("https://api.tavily.com/search", {
      signal: controller.signal,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: "France buzz réseaux sociaux polémique culture web insolite tendance",
        topic: "news",
        days: 1,
        max_results: 8,
      })
    });

    clearTimeout(timeout);
    if (!res.ok) return [];

    const data = await res.json();
    const results = data.results || [];

    return results.map((item: any) => ({
      title: item.title?.trim() || '',
      source: 'Web / Tavily',
      snippet: cleanHtmlText(item.content, 200),
      url: item.url,
      pubDate: item.published_date ? new Date(item.published_date) : undefined
    })).filter((a: CandidateArticle) => a.title.length > 5 && a.snippet.length > 25);
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

// 2. Google News RSS avec extraction de description et filtrage temporel
async function fetchGoogleNewsRSS(): Promise<CandidateArticle[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const query = encodeURIComponent('"culture web" OR "insolite" OR "polémique" OR "réseaux sociaux" OR "buzz" when:1d');
    const url = `https://news.google.com/rss/search?q=${query}&hl=fr&gl=FR&ceid=FR:fr`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    clearTimeout(timeout);
    if (!res.ok) return [];

    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const items: CandidateArticle[] = [];

    $('item').each((_, el) => {
      const title = $(el).find('title').text().trim();
      const link = $(el).find('link').text().trim();
      const source = $(el).find('source').text().trim() || 'Google News';
      const rawDate = $(el).find('pubDate').text().trim();
      const rawDesc = $(el).find('description').text().trim();

      const pubDate = parseAndValidateDate(rawDate, 36);
      if (!pubDate) return; // Écarte les articles absents ou hors de la fenêtre 36h

      const cleanSnippet = cleanHtmlText(rawDesc, 200);

      if (title) {
        items.push({
          title,
          source,
          snippet: cleanSnippet || `Actualité récente relayée par ${source}.`,
          url: link,
          pubDate
        });
      }
    });

    return items;
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

// 3. Flux RSS spécialisés : Next.ink et Arrêt sur Images avec validation de date 36h
async function fetchSpecializedRSS(): Promise<{ nextink: CandidateArticle[]; asi: CandidateArticle[] }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  const feeds = [
    { key: 'nextink' as const, name: 'Next.ink', url: 'https://next.ink/feed/' },
    { key: 'asi' as const, name: 'Arrêt sur Images', url: 'https://api.arretsurimages.net/api/public/rss/all-content' }
  ];

  const output: { nextink: CandidateArticle[]; asi: CandidateArticle[] } = {
    nextink: [],
    asi: []
  };

  try {
    await Promise.allSettled(
      feeds.map(async f => {
        const res = await fetch(f.url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        if (!res.ok) return;

        const xml = await res.text();
        const $ = cheerio.load(xml, { xmlMode: true });

        $('item').each((_, el) => {
          const rawTitle = $(el).find('title').text().trim();
          const link = $(el).find('link').text().trim();
          const rawDate = $(el).find('pubDate').text().trim();
          const descRaw = $(el).find('description').text().trim();

          const pubDate = parseAndValidateDate(rawDate, 36);
          if (!pubDate) return; // Écarte si plus vieux que 36h ou date invalide

          const snippet = cleanHtmlText(descRaw, 200);

          if (rawTitle) {
            output[f.key].push({
              title: rawTitle,
              source: f.name,
              snippet: snippet || `Article d'investigation et analyse (${f.name}).`,
              url: link,
              pubDate
            });
          }
        });
      })
    );

    clearTimeout(timeout);
    return output;
  } catch {
    clearTimeout(timeout);
    return output;
  }
}

// Équilibrage et dédoublonnage fin avec quotas cibles
// Tavily (6), Google News (6), Next.ink (4), Arrêt sur Images (4) -> Max 20 au total
function balanceCandidates(
  groups: {
    tavily: CandidateArticle[];
    gnews: CandidateArticle[];
    nextink: CandidateArticle[];
    asi: CandidateArticle[];
  },
  maxTotal = 20
): CandidateArticle[] {
  const targetQuotas: Record<keyof typeof groups, number> = {
    tavily: 6,
    gnews: 6,
    nextink: 4,
    asi: 4
  };

  const selected: CandidateArticle[] = [];
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();

  const tryAdd = (item: CandidateArticle): boolean => {
    const normUrl = normalizeUrl(item.url);
    const normTitle = normalizeTitle(item.title);

    // Élimine les doublons d'URL normalisée
    if (normUrl && seenUrls.has(normUrl)) return false;

    // Élimine les doublons de titres complets identiques (sans confusion de préfixe)
    if (normTitle && normTitle.length > 5 && seenTitles.has(normTitle)) return false;

    if (normUrl) seenUrls.add(normUrl);
    if (normTitle && normTitle.length > 5) seenTitles.add(normTitle);

    selected.push(item);
    return true;
  };

  const remainingPool: CandidateArticle[] = [];

  // Phase 1 : Remplissage des quotas cibles pour chaque source
  for (const [key, quota] of Object.entries(targetQuotas) as [keyof typeof groups, number][]) {
    const items = groups[key] || [];
    let count = 0;

    for (const item of items) {
      if (count < quota) {
        if (tryAdd(item)) count++;
      } else {
        remainingPool.push(item);
      }
    }
  }

  // Phase 2 : Redistribution fluide des places restantes (jusqu'à maxTotal)
  for (const item of remainingPool) {
    if (selected.length >= maxTotal) break;
    tryAdd(item);
  }

  return selected.slice(0, maxTotal);
}

// Mise en forme textuelle pour Ministral
function formatCandidatesForPrompt(articles: CandidateArticle[]): string {
  if (!articles.length) return "Aucune actualité web récente trouvée.";

  return articles.map(item => {
    const snippetPart = item.snippet ? `\n  Détail : ${item.snippet}` : '';
    const linkPart = item.url ? ` (${item.url})` : '';
    return `- [${item.source}] ${item.title}${linkPart}${snippetPart}`;
  }).join('\n\n');
}

export async function POST(request: Request) {
  const totalStart = Date.now();

  try {
    const { rawInput } = await request.json();
    const input = rawInput?.trim();

    // 1. MODE MANUEL (Strictement isolé, température restaurée à 0.9, timeout 20s, max_tokens 1400)
    if (input) {
      console.log(`[generate] Mode manuel déclenché (${input.length} car)`);
      const summary = await callMistral(PROMPT_INPUT_FILLED(input), 0.9, 20000, 1400);
      return NextResponse.json({ success: true, summary });
    }

    // 2. MODE AUTOMATIQUE : Collecte parallèle multi-sources (Promise.allSettled)
    console.log(`[generate] Mode automatique : démarrage de la collecte parallèle...`);
    const collectStart = Date.now();
    const [trendsRes, tavilyRes, gnewsRes, specRes] = await Promise.allSettled([
      fetchTrendsData(),
      searchTavily(),
      fetchGoogleNewsRSS(),
      fetchSpecializedRSS()
    ]);
    const collectDuration = Date.now() - collectStart;

    const trendsContent = trendsRes.status === 'fulfilled' ? trendsRes.value : 'Aucune tendance disponible.';

    const groups = {
      tavily: tavilyRes.status === 'fulfilled' ? tavilyRes.value : [],
      gnews: gnewsRes.status === 'fulfilled' ? gnewsRes.value : [],
      nextink: specRes.status === 'fulfilled' ? specRes.value.nextink : [],
      asi: specRes.status === 'fulfilled' ? specRes.value.asi : []
    };

    const totalArticlesCollected = groups.tavily.length + groups.gnews.length + groups.nextink.length + groups.asi.length;
    console.log(`[generate] Collecte terminée en ${collectDuration}ms : ${totalArticlesCollected} articles collectés (Tavily: ${groups.tavily.length}, GNews: ${groups.gnews.length}, NextInk: ${groups.nextink.length}, ASI: ${groups.asi.length})`);

    // RÈGLE DE GARDE : Si aucune actualité exploitable n'est récupérée, ne pas appeler le LLM
    if (totalArticlesCollected === 0) {
      return NextResponse.json({ 
        error: "Aucune actualité récente exploitable n'a pu être collectée auprès des sources (RSS/Web). Veuillez réessayer dans quelques instants." 
      }, { status: 503 });
    }

    // Sélection équilibrée avec redistribution des quotas (max 20)
    const normStart = Date.now();
    const balancedArticles = balanceCandidates(groups, 20);
    const formattedArticles = formatCandidatesForPrompt(balancedArticles);
    const normDuration = Date.now() - normStart;
    console.log(`[generate] Sélection équilibrée en ${normDuration}ms : ${balancedArticles.length} articles retenus`);

    const fusedData = `=== TENDANCES X / GOOGLE EN FRANCE (dernières 24h) ===
${trendsContent}

=== ACTUALITÉS CULTURE WEB, BUZZ & SOCIÉTÉ (RSS + Web) ===
${formattedArticles}

Note éditoriale : Ne commente pas la politique classique ennuyeuse. Concentre-toi sur ce qui agite Internet, les polémiques numériques, les absurdités et les dramas croustillants.`;

    const fullPrompt = PROMPT_EMPTY_INPUT(fusedData);
    const estimatedTokens = Math.round((SYSTEM_PROMPT.length + fullPrompt.length) / 3.5);
    console.log(`[generate] Prompt préparé : ${fullPrompt.length} car (~${estimatedTokens} tokens estimés)`);

    // Appel Mistral en mode automatique (température 0.85, timeout sécurisé 23s, max_tokens 1800)
    const summary = await callMistral(fullPrompt, 0.85, 23000, 1800);
    const totalDuration = Date.now() - totalStart;
    console.log(`[generate] Génération terminée avec succès en ${totalDuration}ms au total.`);

    return NextResponse.json({ success: true, summary });

  } catch (error: any) {
    const totalDuration = Date.now() - totalStart;
    console.error(`[generate] Erreur API après ${totalDuration}ms:`, error.message);
    return NextResponse.json({ 
      error: error.message || "Erreur lors de la génération du résumé" 
    }, { status: 500 });
  }
}
