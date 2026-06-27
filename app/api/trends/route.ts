import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET() {
  try {
    const res = await fetch('https://trends24.in/france/', {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
      },
      next: { revalidate: 900 }, // 15 min de cache
    });

    if (!res.ok) throw new Error('Trends24 inaccessible');

    const html = await res.text();
    const $ = cheerio.load(html);
    const trends = new Set<string>(); // Pour éviter les doublons

    // On cible seulement la première section (la plus récente)
    $('.trend-card__list li, .trend-name').each((_, el) => {
      const name = $(el).text().trim();
      
      if (name && 
          !name.includes('ago') && 
          !name.includes('hours') && 
          name.length > 1) {
        trends.add(name);
      }
    });

    // On prend maximum 12-15 tendances uniques
    const uniqueTrends = Array.from(trends).slice(0, 15);

    const formatted = uniqueTrends.map((trend, i) => 
      `${i + 1}. **${trend}**`
    );

    return NextResponse.json({ 
      trends: formatted.length 
        ? formatted.join('\n') 
        : 'Aucune tendance disponible pour le moment.' 
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ 
      trends: 'Erreur lors du chargement des tendances France.' 
    }, { status: 500 });
  }
}