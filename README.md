# \# 🔥 MuseNews (ex X-Free)



\*\*Ton résumé buzz France sarcastique, sans te pourrir la vie.\*\*



Application Next.js qui transforme du texte brut (trends + actu X) en \*\*résumés fun, incisifs et bien vénères\*\* dans le style pote décontracté.



\---



\## ✨ Fonctionnalités



\- Récupération automatique des \*\*tendances France\*\* (via trends24.in)

\- Génération de résumés sarcastiques grâce à Groq (Llama 3.1)

\- Style fidèle : "ouais", "putain", "ça part en couille", vannes naturelles

\- Cache quotidien + rate limit (1 génération par heure)

\- Tout en localStorage (aucune base de données)

\- Design dark moderne et responsive

\- Déploiement gratuit sur Vercel



\---



\## 🛠️ Installation locale



```bash

\# 1. Créer le projet

npx create-next-app@latest musenews --typescript --tailwind --eslint --app --yes



cd musenews



\# 2. Installer les dépendances

npm install cheerio react-markdown lucide-react



📁 Structure principale

textmusenews/

├── app/

│   ├── api/

│   │   ├── trends/route.ts          # Récupère les tendances

│   │   └── generate/route.ts        # Appelle Groq + prompt

│   └── page.tsx                     # Interface utilisateur

├── .env.local

├── AGENTS.md

├── README.md

└── package.json



🚀 Mise en route



Crée un fichier .env.local à la racine :envGROQ\_API\_KEY=gsk\_ta\_cle\_groq\_ici

Lance le projet en local :Bashnpm run dev

Va sur http://localhost:3000





📤 Déploiement sur Vercel



Pousse ton code sur GitHub

Connecte le repo sur vercel.com

Ajoute la variable d’environnement GROQ\_API\_KEY dans les Settings

Déploie !





🎯 Comment l’utiliser



Va sur la page

Colle dans la zone de texte les tendances + news du jour (tu peux me demander un brut ici si tu veux)

Clique sur "Générer le résumé"

Profite du texte bien saignant





⚠️ Limitations



Rate limit : 1 génération par heure (via localStorage)

Dépend de la stabilité de trends24.in

Pas de persistance entre navigateurs/appareils





🧠 Agents

Voir AGENTS.md

