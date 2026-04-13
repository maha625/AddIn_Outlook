const ACTION_MAP: Record<string, { label: string }> = {
  "historique": { label: "Historique des évènements" },
  "sav": { label: "Évènement SAV" },
  "negoce": { label: "Évènement Négoce" },
  "demande-prix": { label: "Entrée de demande de prix" },
  "commande": { label: "Entrée de commande" },
  "info": { label: "Demande d'information" },
};

const API_BASE_URL = "http://localhost:8000";

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
  user?: { id: number; domain: string; logo: string | null };
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
      (window as any).__divaUserEmail = userEmail;
      if (data.user?.logo) displayLogoAvatar(data.user.logo);
      setStatus("ready", data.message || "Utilisateur reconnu");
    } else {
      setStatus("ready", data.error || "Utilisateur non reconnu");
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
    if (!isTechnicalAlias) { resolve(profileEmail); return; }
    Office.context.mailbox.getUserIdentityTokenAsync((result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        try {
          const tokenParts = result.value.split(".");
          const payload = JSON.parse(atob(tokenParts[1]));
          resolve(payload["preferred_username"] || payload["upn"] || payload["smtp"] || profileEmail);
        } catch (e) { resolve(profileEmail); }
      } else { resolve(profileEmail); }
    });
  });
}

function displayUser(user: { name: string; email: string }): void {
  const initials = user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const avatarEl = document.getElementById("user-avatar");
  const nameEl   = document.getElementById("user-name");
  const emailEl  = document.getElementById("user-email");
  if (avatarEl) avatarEl.textContent = initials || "?";
  if (nameEl)   nameEl.textContent   = user.name;
  if (emailEl)  emailEl.textContent  = user.email;
}

function displayLogoAvatar(logoUrl: string): void {
  const avatarEl = document.getElementById("user-avatar");
  if (!avatarEl) return;
  avatarEl.textContent = "";
  const img = document.createElement("img");
  img.src = logoUrl;
  img.style.cssText = "width:100%; height:100%; object-fit:contain; border-radius:inherit;";
  avatarEl.appendChild(img);
}

// ─────────────────────────────────────────────
//  EMAIL
// ─────────────────────────────────────────────
interface EmailInfo { subject: string; senderEmail: string; }

function getEmailInfo(): EmailInfo | null {
  const item = Office.context.mailbox.item;
  if (!item) return null;
  return {
    subject: item.subject || "(Sans objet)",
    senderEmail: (item as any).from?.emailAddress || "inconnu",
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
//  PIÈCES JOINTES
// ─────────────────────────────────────────────
interface AttachmentData {
  name: string;
  content: string; // base64
  contentType: string;
  size: number;
}

function getAttachments(): Promise<AttachmentData[]> {
  return new Promise((resolve) => {
    const item = Office.context.mailbox.item;
    const attachments = item?.attachments;
    if (!attachments || attachments.length === 0) { resolve([]); return; }

    const fileAttachments = attachments.filter(
      (a) => a.attachmentType === Office.MailboxEnums.AttachmentType.File
    );
    if (fileAttachments.length === 0) { resolve([]); return; }

    const promises = fileAttachments.map(
      (attachment) =>
        new Promise<AttachmentData | null>((res) => {
          item.getAttachmentContentAsync(attachment.id, (result) => {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
              res({
                name: attachment.name,
                content: result.value.content,
                contentType: attachment.contentType || "application/octet-stream",
                size: attachment.size,
              });
            } else {
              console.warn("[Diva] PJ ignorée :", attachment.name, result.error);
              res(null);
            }
          });
        })
    );

    Promise.all(promises).then((results) => {
      resolve(results.filter((r): r is AttachmentData => r !== null));
    });
  });
}

// ─────────────────────────────────────────────
//  ACTION — Envoi vers Dolibarr
// ─────────────────────────────────────────────
(window as any).handleAction = async function (btn: HTMLButtonElement): Promise<void> {
  const actionKey    = btn.getAttribute("data-action") || "";
  const action       = ACTION_MAP[actionKey];
  const sessionToken = (window as any).__divaSessionToken;
  const userEmail    = (window as any).__divaUserEmail;
  const emailInfo    = getEmailInfo();

  if (!action || !sessionToken) {
    console.error("Action ou Session manquante");
    return;
  }

  Office.context.mailbox.item.body.getAsync(Office.CoercionType.Text, async (result) => {
    if (result.status === Office.AsyncResultStatus.Succeeded) {

      setStatus("loading", "Récupération des pièces jointes…");
      const attachments = await getAttachments();
      console.log(`[Diva] ${attachments.length} pièce(s) jointe(s) trouvée(s)`);

      const payload = {
        session_token: sessionToken,
        user_email:    userEmail,
        sender_email:  emailInfo?.senderEmail,
        subject:       emailInfo?.subject,
        email_body:    btoa(unescape(encodeURIComponent(result.value))),
        action_label:  action.label,
        attachments:   attachments,
      };

      try {
        setStatus("loading", "Envoi à Dolibarr...");
        const response = await fetch(`${API_BASE_URL}/evenement/create_event.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (data.success) {
          const pjMsg = attachments.length > 0 ? ` (${attachments.length} PJ)` : "";
          setStatus("ready", `Événement créé !${pjMsg}`);
        } else {
          setStatus("error", "Échec de création");
        }
      } catch (err) {
        console.error("Erreur lors de l'envoi :", err);
        setStatus("error", "Erreur réseau");
      }
    }
  });
}; // ← fermeture de handleAction

// ─────────────────────────────────────────────
//  UTILITAIRES
// ─────────────────────────────────────────────
function setStatus(type: "ready" | "loading" | "error", message: string): void {
  const indicator = document.getElementById("status-indicator");
  const text      = document.getElementById("status");
  if (indicator) indicator.className = `status-indicator ${type}`;
  if (text)      text.textContent    = message;
}