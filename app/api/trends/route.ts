import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function fetchTrendsData(): Promise<string> {
  const res = await fetch('https://trends24.in/france/', {
    headers: { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
    },
    next: { revalidate: 900 },
  });

  if (!res.ok) return 'Aucune tendance disponible.';

  const html = await res.text();
  const $ = cheerio.load(html);
  const trends = new Set<string>();

  $('.trend-card__list li, .trend-name').each((_, el) => {
    const name = $(el).text().trim();
    if (name && !name.includes('ago') && name.length > 1) {
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