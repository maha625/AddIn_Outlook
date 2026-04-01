const ACTION_MAP: Record<string, { label: string }> = {
  "historique": { label: "Historique des évènements" },
  "sav": { label: "Évènement SAV" },
  "negoce": { label: "Évènement Négoce" },
  "demande-prix": { label: "Entrée de demande de prix" },
  "commande": { label: "Entrée de commande" },
  "info": { label: "Demande d'information" },
};

// ─────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────
const API_BASE_URL = "http://localhost:8000/backend_AddIn"; // ← à adapter

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
Office.onReady(() => {
  initApp();
});

async function initApp(): Promise<void> {
  setStatus("loading", "Connexion Outlook…");

  try {
    const user = getUserInfo();
    displayUser(user);

    const email = getEmailInfo();

    if (email) {
      displayEmailInfo(email);
      const realEmail = await getRealUserEmail();
      console.log("[Diva] Email réel utilisé pour auth :", realEmail);
      await authenticateWithAPI(realEmail);
    } else {
      displayNoEmail();
      setStatus("error", "Aucun email détecté");
    }

  } catch (err) {
    console.error("[Diva] Erreur init:", err);
    setStatus("error", "Erreur de chargement");
  }
}

// ─────────────────────────────────────────────
//  AUTHENTIFICATION API
// ─────────────────────────────────────────────
interface AuthResponse {
  success?: boolean;
  message?: string;
  error?: string;
  user?: {
    id: number;
    domain: string;
    logo: string | null;
  };
  session_token?: string;
}

async function authenticateWithAPI(userEmail: string): Promise<void> {
  try {
    setStatus("loading", "Identification de l'entreprise…");

    const response = await fetch(`${API_BASE_URL}/authentification/auth.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail }),
    });

    const data: AuthResponse = await response.json();

    if (data.success && data.session_token) {
      (window as any).__divaSessionToken = data.session_token;

      if (data.user?.logo) {
        displayLogoAvatar(data.user.logo);
      }

      setStatus("ready", data.message || "Utilisateur reconnu");
      setTimeout(() => {
        setStatus("ready", "Email prêt à traiter");
      }, 5000);


    } else {
      console.warn("[Diva] Entreprise non reconnue :", data.error);
      setStatus("ready", data.error || "Utilisateur non reconnu");
      setTimeout(() => {
        setStatus("ready", "Email prêt à traiter");
      }, 5000);

    }

  } catch (err) {
    console.error("[Diva] Erreur auth API:", err);
    setStatus("error", "Impossible de contacter le serveur");
  }
}

// ─────────────────────────────────────────────
//  UTILISATEUR
// ─────────────────────────────────────────────
function getUserInfo(): { name: string; email: string } {
  const profile = Office.context.mailbox.userProfile;
  return {
    name: profile.displayName || "Utilisateur",
    email: profile.emailAddress || "",
  };
}

function getRealUserEmail(): Promise<string> {
  return new Promise((resolve) => {
    const profile = Office.context.mailbox.userProfile;
    const profileEmail = profile.emailAddress || "";

    const isTechnicalAlias = /^outlook_[A-F0-9]+@outlook\.com$/i.test(profileEmail);

    if (!isTechnicalAlias) {
      resolve(profileEmail);
      return;
    }

    // Alias détecté → décoder le vrai email depuis le JWT identity token
    Office.context.mailbox.getUserIdentityTokenAsync((result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        try {
          const tokenParts = result.value.split(".");
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log("[Diva] JWT payload :", payload);

          const realEmail =
            payload["preferred_username"] ||
            payload["upn"] ||
            payload["smtp"] ||
            profileEmail;

          console.log("[Diva] Email extrait du JWT :", realEmail);
          resolve(realEmail);
        } catch (e) {
          console.error("[Diva] Erreur décodage JWT :", e);
          resolve(profileEmail);
        }
      } else {
        console.warn("[Diva] getUserIdentityTokenAsync échoué :", result.error);
        resolve(profileEmail);
      }
    });
  });
}

function displayUser(user: { name: string; email: string }): void {
  const initials = user.name
    .split(" ")
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const avatarEl = document.getElementById("user-avatar");
  const nameEl = document.getElementById("user-name");
  const emailEl = document.getElementById("user-email");

  if (avatarEl) avatarEl.textContent = initials || "?";
  if (nameEl) nameEl.textContent = user.name;
  if (emailEl) emailEl.textContent = user.email;
}

function displayLogoAvatar(logoUrl: string): void {
  const avatarEl = document.getElementById("user-avatar");
  if (!avatarEl) return;

  avatarEl.textContent = "";
  const img = document.createElement("img");
  img.src = logoUrl;
  img.alt = "Logo entreprise";
  img.style.cssText = "width:100%; height:100%; object-fit:contain; border-radius:inherit;";

  img.onerror = () => {
    const nameEl = document.getElementById("user-name");
    const name = nameEl?.textContent || "?";
    const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
    avatarEl.textContent = initials || "?";
  };

  avatarEl.appendChild(img);
}

// ─────────────────────────────────────────────
//  EMAIL
// ─────────────────────────────────────────────
interface EmailInfo {
  subject: string;
  senderEmail: string;
}

function getEmailInfo(): EmailInfo | null {
  const item = Office.context.mailbox.item;
  if (!item) return null;

  const from = (item as any).from;

  return {
    subject: (item as any).subject || "(Sans objet)",
    senderEmail: from?.emailAddress || "inconnu",
  };
}

function displayEmailInfo(email: EmailInfo): void {
  const subjectEl = document.getElementById("email-subject");
  const senderEl = document.getElementById("sender-email");

  if (subjectEl) subjectEl.textContent = email.subject;
  if (senderEl) senderEl.textContent = email.senderEmail;
}

function displayNoEmail(): void {
  const subjectEl = document.getElementById("email-subject");
  if (subjectEl) subjectEl.textContent = "Ouvrez un email pour commencer";
}

// ─────────────────────────────────────────────
//  ACTION — clic bouton
// ─────────────────────────────────────────────
(window as any).handleAction = function (btn: HTMLButtonElement): void {
  const actionKey = btn.getAttribute("data-action") || "";
  const action = ACTION_MAP[actionKey];

  if (!action) {
    console.warn("[Diva] Action inconnue :", actionKey);
    return;
  }

  console.log(`[Diva] Action : "${action.label}"`);
  setStatus("loading", `${action.label}…`);

  setTimeout(() => {
    setStatus("ready", "Email prêt à traiter");
  }, 3000);
};

// ─────────────────────────────────────────────
//  STATUT
// ─────────────────────────────────────────────
type StatusType = "ready" | "loading" | "error";

function setStatus(type: StatusType, message: string): void {
  const indicator = document.getElementById("status-indicator");
  const text = document.getElementById("status");

  if (indicator) indicator.className = `status-indicator ${type}`;
  if (text) text.textContent = message;
}