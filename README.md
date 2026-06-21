# 🚀 Projet Outlook Add-in & Dolibarr

> Intégration complète entre **Dolibarr ERP/CRM** et **Microsoft 365 Outlook** via un complément Office.js, une API PHP centralisée et une interface d’administration React.
Ce guide explique comment installer et configurer les  composants principaux du projet :

---

# 📦 Architecture Globale

```text
.
├── backend_admin/      → API centrale + accès BDD
├── backend_AddIn/      → API métier Outlook
├── frontend_admin/     → Dashboard React
├── Outlook_UI/         → Add-in Outlook Office.js
└── icons/              → Assets + CORS
```

---

# 📋 Pré-requis Système

Avant de commencer, assurez-vous d’avoir installé :

| Outil | Version recommandée |
| --- | --- |
| Node.js | ≥ 16.x |
| PHP | ≥ 8.x |
| Composer | Dernière version |
| MySQL  | ≥ 5.7 |
| Serveur Web | Apache / Nginx |

### Environnements compatibles

- WAMP
- XAMPP
- Laragon
- Docker
- Apache/Nginx Linux

---

# 🗂️ Déploiement Backend (PHP)

 :

```text
/
│
├── backend_admin/
├── backend_AddIn/
└── icons/
```

---

# 1️⃣ Backend Admin — API Centrale

Le module `backend_admin` :

- centralise l’accès aux données
- initialise PDO
- protège les variables sensibles via `.env`
- expose les endpoints d’administration

---

## 📥 Installation

Positionnez-vous dans le dossier :

```bash
cd backend_admin
```

Installez les dépendances PHP :

```bash
composer install
```

---

## ⚙️ Configuration `.env`

Dupliquez :

```text
.env.example
```

en :

```text
.env
```

Puis configurez :

```env
DB_HOST=localhost
DB_NAME=votre_base_de_donnees
DB_USER=root
DB_PASSWORD=votre_mot_de_passe
```

---

## 🔌 Fonctionnement Interne

Le fichier :

```php
backend_admin/db.php
```

charge automatiquement :

- les variables d’environnement
- la connexion PDO
- la configuration globale

---
# 🎨 Gestion des Palettes

Les palettes de couleurs sont gérées via un fichier de configuration statique :

```text
backend_admin/palettes.json
```

## ➕ Ajouter une nouvelle palette

Ouvrir le fichier :

```text
backend_admin/palettes.json
```

Ajouter une entrée selon le format suivant :

```json
{
  "id": "mon_identifiant",
  "label": "Nom affiché",
  "colors": {
    "primary": "#2563eb",
    "secondary": "#1e40af",
    "background": "#f0f4ff",
    "text": "#1a1a2e"
  }
}
```

## ✅ Important

- Aucune modification du code source requise
- Aucune migration de base de données
- La nouvelle palette est disponible **immédiatement** dans l'interface d'administration
- L'API lit le fichier dynamiquement à chaque requête

# 2️⃣ Backend Add-In — API Outlook

Le module `backend_AddIn` gère :

- authentification Outlook
- synchronisation des événements
- mapping des tiers
- logique métier Dolibarr

---

## 🔗 Mutualisation de la connexion BDD

Le backend Add-In réutilise directement la connexion PDO du backend principal :

```php
require_once __DIR__ . '/../backend_admin/db.php';
```

---

## ✅ Important

Les dossiers :

```text
backend_admin
backend_AddIn
```

doivent impérativement partager le même dossier parent.

---

# 🛡️ Frontend Admin — Dashboard React

Interface d’administration et de supervision du système.

---

## 📥 Installation

```bash
cd frontend_admin
npm install
```

---

## ⚙️ Configuration `.env`

Créer :

```text
frontend_admin/.env
```

Ajouter :

```env
REACT_APP_API_URL=http://localhost/backend_admin/
REACT_APP_ICONS_BASE_URL=http://localhost/icons/cors.php
```

---

## ▶️ Démarrage

```bash
npm start
```

---

## 💡 Important

Les variables :

```text
REACT_APP_*
```

sont injectées au build React.

Après modification du `.env` :

🔁 redémarrez toujours `npm start`.

---

# 📧 Outlook UI — Add-in Office.js

Application embarquée directement dans Microsoft Outlook.

---

## ⚙️ Configuration API

Dans :

```text
src/taskpane/taskpane.ts
```

Configurer :

```typescript
const API_BASE_URL   = "http://localhost/backend_addin";
const ICONS_BASE_URL = "http://localhost/icons/cors.php";
```

---

## 📥 Installation & lancement

```bash
cd Outlook_UI
npm install
```

### ▶️ Démarrage

**Méthode 1**
```bash
npm start
```

**Méthode 2(si la première ne marche pas) — Dans deux terminaux séparés**

Terminal 1 :
```bash
npm run dev-server
```

Terminal 2 :
```bash
npx office-addin-debugging start manifest.xml
```

> 💡 La méthode 2 lance le serveur webpack dans le premier terminal,
> puis charge automatiquement le complément dans Outlook via le second.

---
## 🔒 Sécurité HTTPS

Le serveur local Office.js utilise HTTPS automatiquement.

Cela est obligatoire pour :

- Outlook Desktop
- Outlook Web
- Microsoft 365

---

# 📨 Chargement du Complément Outlook (Sideloading)

## Étapes

1. Ouvrir Outlook Web
2. Créer ou ouvrir un mail
3. Cliquer sur :

```text
Compléments
```

ou :

```text
...
→ Obtenir des compléments
```

4. Aller dans :

```text
Mes compléments
```

5. Descendre jusqu’à :

```text
Compléments personnalisés
```

6. Cliquer :

```text
Ajouter un complément personnalisé
```

7. Sélectionner :

```text
Outlook_UI/manifest.xml
```

---

# 📊 Matrice des Composants

| Composant | Type | Fonction |
| --- | --- | --- |
| `Outlook_UI` | Office.js Client | Interface Outlook |
| `frontend_admin` | React SPA | Dashboard administrateur |
| `backend_admin` | API PHP | Gestion BDD & administration |
| `backend_AddIn` | API PHP | Logique métier Outlook |
| `icons` | Serveur statique | Gestion des assets & CORS |

---

# 🔄 Flux d’Interaction

```text
Outlook_UI
    ↓
backend_AddIn
    ↓
backend_admin
    ↓
MySQL

frontend_admin
    ↓
backend_admin
```

---

# 🧪 Conseils de Debug

## Vérifier et adapter  les APIs selon vos chemins et ports

Tester :

```text
http://localhost/backend_admin/
http://localhost/backend_AddIn/
```

---

## Vérifier HTTPS Office.js

Si Outlook refuse le complément :

- vérifier le certificat local
- vérifier que `npm start` est actif

---

## Vérifier CORS

Tester :

```text
http://localhost/icons/cors.php
```

---

# 🏗️ Stack Technique

| Technologie | Usage |
| --- | --- |
| React | Frontend Admin |
| TypeScript | Outlook Add-in |
| Office.js | Intégration Outlook |
| PHP | APIs Backend |
| PDO | Accès MySQL |
| dotenv | Variables d’environnement |
| MySQL | Base de données |

---

# 👨‍💻 Projet

Développé dans le cadre de l’intégration :

## Dolibarr ERP/CRM × Microsoft 365 Outlook

---