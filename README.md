# 🚀 Guide de mise en place — Projet Outlook Add-in & Dolibarr

Ce guide explique comment installer et configurer les trois composants principaux du projet : le complément Outlook, les services backend (PHP) et le portail d'administration.

---

## 📋 Pré-requis

- **Node.js** (v16+)
- **Serveur PHP** (WAMP, XAMPP, Laragon ou PHP local)
- **Base de données** MySQL
- **Instance Dolibarr** active avec le module API REST activé

---

## 1. 📂 Backend : Configuration des services (PHP)

Le backend est divisé en deux services distincts à héberger sur votre serveur web (ex : `htdocs` ou `www`).

### A. Backend Add-in (liaison Dolibarr)

Ce dossier gère la logique métier entre Outlook et Dolibarr.

1. Placez le dossier `backend_AddIn` sur votre serveur PHP.
2. Ouvrez le fichier `config.php`.
3. Configurez les variables suivantes avec vos accès Dolibarr :
   - URL de l'instance Dolibarr
   - Clé API (token) de l'administrateur Dolibarr

### B. Backend Admin (base de données interne)

Ce dossier gère l'authentification et la configuration du panel d'administration.

1. Placez le dossier `backend_admin` sur votre serveur PHP.
2. Créez une base de données **MySQL**.
3. Modifiez le fichier `backend_admin/db.php` avec vos identifiants de connexion (`host`, `dbname`, `user`, `password`).
4. **Note importante :** relevez l'URL de ce service (ex : `http://localhost/backend_admin/`) pour l'étape suivante.

---

## 2. 🛡️ Frontend : Interface d'administration (React)

Ce tableau de bord permet de gérer la configuration globale du système.

```bash
cd frontend_admin

# 1. Installer les dépendances
npm install

# 2. Configurer le lien API
# Créez ou modifiez le fichier .env et ajoutez :
# REACT_APP_API_URL=http://votre-lien-backend-admin/

# 3. Lancer l'application
npm start
```

---

## 3. 📧 Frontend : Complément Outlook UI (Office.js)

Cette interface sera injectée directement dans Microsoft Outlook.

```bash
cd Outlook_UI

# 1. Installer les dépendances
npm install

# 2. Démarrer le serveur local (HTTPS par défaut)
npm start
```

### Chargement dans Outlook

1. Ouvrez https://outlook.office.com/
2. Créez un **Nouveau message**
3. Cliquez sur l'icône **Compléments** (ou les trois points `...`)
4. Choisissez **Gérer les compléments > Mes compléments**
5. Cliquez sur **Ajouter un complément personnalisé > Ajouter à partir d’un fichier**
6. Sélectionnez le fichier `manifest.xml` situé à la racine du dossier `Outlook_UI`

---

## 📊 Résumé des flux

| Composant          | Rôle                          | Configuration clé |
|-------------------|------------------------------|------------------|
| **Outlook_UI**     | Interface utilisateur Add-in | `manifest.xml`   |
| **Backend_AddIn**  | Pont API Dolibarr           | `config.php`     |
| **Backend_Admin**  | Gestion DB & sécurité       | `db.php`         |
| **Frontend_Admin** | Panel de gestion            | `.env`           |

---

*Développé dans le cadre de l'intégration Dolibarr × Microsoft 365 Outlook.*