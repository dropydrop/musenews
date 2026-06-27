# AGENTS.MD - MuseNews (ex X-Free)

## 📋 Description du Projet
Application web Next.js qui génère des **résumés buzz France sarcastiques** à partir de texte brut (trends + actualité X).  
Style : pote décontracté, vannes incisives, ton oral français.

## 🏗️ Architecture

### 1. Frontend (`app/page.tsx`)
- Interface moderne dark mode
- Récupération automatique des tendances France via API interne
- Zone de texte pour coller le contenu brut
- Gestion du cache + rate limit (1 génération par heure) via `localStorage`
- Affichage du résumé en Markdown

### 2. API Routes (les "Agents")

#### Agent 1 : Trends Scraper
- **Fichier** : `app/api/trends/route.ts`
- Rôle : Scrape https://trends24.in/france/ toutes les 30 minutes (cache Vercel)
- Retourne les top tendances en Markdown

#### Agent 2 : Groq Summarizer
- **Fichier** : `app/api/generate/route.ts`
- Rôle : Envoie le prompt + texte brut à Groq (llama-3.1-8b-instant)
- Applique le style sarcastique demandé
- Retourne uniquement le résumé final

### 3. Configuration

**Variables d'environnement** (`.env.local` + Vercel) :
- `GROQ_API_KEY` → Ta clé Groq

**Rate Limiting** : 1 génération par heure (via localStorage)

## 📁 Structure importante

musenews/
├── app/
│   ├── api/
│   │   ├── trends/route.ts          # Agent Trends
│   │   └── generate/route.ts        # Agent Groq
│   └── page.tsx                     # Interface principale
├── .env.local
├── AGENTS.md
└── package.json
text## 🚀 Comment ça marche

1. L’utilisateur colle du texte brut (trends + news)
2. Clique sur "Générer"
3. L’API `/generate` appelle Groq avec un prompt très précis
4. Le résumé est sauvegardé dans le navigateur (localStorage)
5. Prochaine génération bloquée pendant 1h

## 🎯 Objectif
Remplacer l’ancien Streamlit par une version plus légère, plus rapide et 100% gratuite sur Vercel (Hobby tier).

## ⚠️ Limitations connues
- Rate limit Groq géré côté client (pas infaillible)
- Pas de persistance serveur (localStorage = par navigateur)
- Dépend de la stabilité de trends24.in

---

Dernière mise à jour : Juin 2026
Créé pour rester informé sans doomscrolling.