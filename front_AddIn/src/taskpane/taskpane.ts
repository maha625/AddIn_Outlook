
const ACTION_MAP: Record<string, { label: string }> = {
  "historique":   { label: "Historique des évènements" },
  "sav":          { label: "Évènement SAV",                },
  "negoce":       { label: "Évènement Négoce",              },
  "demande-prix": { label: "Entrée de demande de prix",     },
  "commande":     { label: "Entrée de commande",             },
  "info":         { label: "Demande d'information" },
};

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
      setStatus("ready", "Email prêt à traiter");
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
//  UTILISATEUR
// ─────────────────────────────────────────────
function getUserInfo(): { name: string; email: string } {
  const profile = Office.context.mailbox.userProfile;
  return {
    name:  profile.displayName  || "Utilisateur",
    email: profile.emailAddress || "",
  };
}

function displayUser(user: { name: string; email: string }): void {
  const initials = user.name
    .split(" ")
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const avatarEl = document.getElementById("user-avatar");
  const nameEl   = document.getElementById("user-name");
  const emailEl  = document.getElementById("user-email");

  if (avatarEl) avatarEl.textContent = initials || "?";
  if (nameEl)   nameEl.textContent   = user.name;
  if (emailEl)  emailEl.textContent  = user.email;
}

// ─────────────────────────────────────────────
//  EMAIL
// ─────────────────────────────────────────────
interface EmailInfo {
  subject:     string;
  senderEmail: string;
}

function getEmailInfo(): EmailInfo | null {
  const item = Office.context.mailbox.item;
  if (!item) return null;

  const from = (item as any).from;

  return {
    subject:     (item as any).subject   || "(Sans objet)",
    senderEmail: from?.emailAddress      || "inconnu",
  };
}

function displayEmailInfo(email: EmailInfo): void {
  const subjectEl = document.getElementById("email-subject");
  const senderEl  = document.getElementById("sender-email");
  
  if (subjectEl) subjectEl.textContent = email.subject;
  if (senderEl)  senderEl.textContent  = email.senderEmail;

 
  
}

function displayNoEmail(): void {
  const subjectEl = document.getElementById("email-subject");
  if (subjectEl) subjectEl.textContent = "Ouvrez un email pour commencer";
}

// ─────────────────────────────────────────────
//  ACTION — clic bouton
// ─────────────────────────────────────────────

(window as any).handleAction = function(btn: HTMLButtonElement): void {
  const actionKey = btn.getAttribute("data-action") || "";
  const action    = ACTION_MAP[actionKey];

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
  const text      = document.getElementById("status");

  if (indicator) indicator.className = `status-indicator ${type}`;
  if (text)      text.textContent    = message;
}