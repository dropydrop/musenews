import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET() {
  try {
    const res = await fetch('https://trends24.in/france/', {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
      },
      next: { revalidate: 1800 },
    });

    if (!res.ok) throw new Error('Trends24 inaccessible');

    const html = await res.text();
    const $ = cheerio.load(html);
    const trends: string[] = [];

    $('ol.trend-card__list li, .trend-name, a[href*="/search?q="]').slice(0, 15).each((_, el) => {
      const name = $(el).text().trim();
      if (name && (name.startsWith('#') || name.length < 40)) {
        trends.push(`${trends.length + 1}. **${name}**`);
      }
    });

    return NextResponse.json({ 
      trends: trends.length ? trends.join('\n') : 'Aucune tendance disponible pour le moment.' 
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ trends: 'Erreur lors du chargement des trends.' }, { status: 500 });
  }
}