import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// Source 1 : trends24.in
async function scrapeTrends24(): Promise<string[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch('https://trends24.in/france/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const trends = new Set<string>();

    $('a.trend-link').each((_, el) => {
      const name = $(el).text().trim();
      if (name && name.length > 1) {
        trends.add(name);
      }
    });

    return Array.from(trends);
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

// Source 2 : getdaytrends.com (Trends X / Twitter France)
async function scrapeGetDayTrends(): Promise<string[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch('https://getdaytrends.com/france/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const trends = new Set<string>();

    $('td.main a').each((_, el) => {
      const name = $(el).text().trim();
      if (name && name.length > 1) {
        trends.add(name);
      }
    });

    return Array.from(trends);
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

// Source 3 : Google Trends France RSS (100% ouvert, jamais bloqué par Vercel)
async function scrapeGoogleTrends(): Promise<string[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch('https://trends.google.com/trending/rss?geo=FR', {
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!res.ok) return [];

    const xml = await res.text();
    const titles = [...xml.matchAll(/<title>(.*?)<\/title>/g)]
      .map(m => m[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim())
      .slice(2); // Saute le titre du channel

    return titles.filter(t => t.length > 1);
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

export async function fetchTrendsData(): Promise<string> {
  // 1. Tente trends24.in
  let trends = await scrapeTrends24();

  // 2. Fallback X France : getdaytrends.com (si Cloudflare bloque Vercel sur trends24)
  if (!trends.length) {
    trends = await scrapeGetDayTrends();
  }

  // 3. Fallback garanti : Google Trends France RSS
  if (!trends.length) {
    trends = await scrapeGoogleTrends();
  }

  const topTrends = trends.slice(0, 15);
  if (!topTrends.length) return 'Aucune tendance disponible.';

  return topTrends.map((t, i) => `${i + 1}. ${t}`).join('\n');
}

export async function GET() {
  try {
    const trends = await fetchTrendsData();
    return NextResponse.json({ trends });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ 
      trends: 'Erreur lors du chargement des tendances France.' 
    }, { status: 500 });
  }
}
