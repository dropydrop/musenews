import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET() {
  try {
    const res = await fetch('https://trends24.in/france/', {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
      },
      next: { revalidate: 900 },
    });

    if (!res.ok) throw new Error('Trends24 inaccessible');

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

    const formatted = uniqueTrends.map((trend, i) => 
      `${i + 1}. ${trend}`
    );

    return NextResponse.json({ 
      trends: formatted.length ? formatted.join('\n') : 'Aucune tendance disponible.' 
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ 
      trends: 'Erreur lors du chargement des tendances France.' 
    }, { status: 500 });
  }
}