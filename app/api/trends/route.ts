import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function fetchTrendsData(): Promise<string> {
  const res = await fetch('https://trends24.in/france/', {
    headers: { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9',
    },
    cache: 'no-store',
  });

  if (!res.ok) return 'Aucune tendance disponible.';

  const html = await res.text();
  const $ = cheerio.load(html);
  const trends = new Set<string>();

  $('a.trend-link').each((_, el) => {
    const name = $(el).text().trim();
    if (name && name.length > 1) {
      trends.add(name);
    }
  });

  const uniqueTrends = Array.from(trends).slice(0, 15);
  if (!uniqueTrends.length) return 'Aucune tendance disponible.';

  return uniqueTrends.map((t, i) => `${i + 1}. ${t}`).join('\n');
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
