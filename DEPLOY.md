# Déploiement AMG Rénovation

Ce projet contient l'application React complète, le backend mocké (localStorage), et les workflows n8n.

## 1. Mise en ligne (GitHub Pages / Vercel / Netlify)

Le moyen le plus simple est d'utiliser **Vercel** ou **Netlify** gratuitement.

1. Créez un compte sur [Vercel](https://vercel.com) ou [Netlify](https://netlify.com).
2. **Méthode recommandée** :
   - Depuis le dossier `amg-renovation`, créez un ZIP du dossier `dist`.
   - Glissez ce ZIP (ou le dossier `dist`) sur <https://app.netlify.com/drop>.

L'application sera en ligne immédiatement avec une URL publique (ex: `amg-renovation.vercel.app`).

## 2. Export vers GitHub

Si vous voulez mettre le code source sur GitHub :

1. Créez un nouveau repository sur [GitHub](https://github.com/new).
2. Ouvrez un terminal dans ce dossier et lancez :

```powershell
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/VOTRE-NOM-UTILISATEUR/amg-renovation.git
git push -u origin main
```

## 3. Workflows N8N

Les workflows n8n sont dans le dossier `n8n/`.
Pour les déployer sur votre instance n8n pro :

```powershell
cd n8n
node deploy_all_workflows.js
```

## 4. Authentification

L'application est protégée par un login.
**Identifiants par défaut :**

- Email : `admin@amg-renovation.fr`
- Mot de passe : `amg2024!`

Pour modifier cela, éditez `src/pages/Login.tsx`.

## 5. Export Manuel

Si le script de zip automatique a échoué :

- Code Source : Zippez tout le dossier `amg-renovation` **sauf** `node_modules` et `.git`.
- Build (Production) : Zippez uniquement le dossier `dist` pour le déploiement.
