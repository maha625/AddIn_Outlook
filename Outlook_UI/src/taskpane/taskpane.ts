/// <reference types="@types/office-js" />

interface ClientButton {
  id: number;
  client_id: number;
  label: string;
  event_name: string;
  bg_color: string;
  text_color: string;
  icon: string;
}

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
      const sessionToken = await authenticateWithAPI(realEmail);
      if (sessionToken) {
        await loadActionButtons(sessionToken);
      }
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

async function authenticateWithAPI(userEmail: string): Promise<string | null> {
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
      return data.session_token;
    }
    setStatus("ready", data.error || "Utilisateur non reconnu");
    return null;
  } catch (err) {
    console.error("[Diva] Erreur auth API:", err);
    setStatus("error", "Impossible de contacter le serveur");
    return null;
  }
}

async function loadActionButtons(sessionToken: string): Promise<void> {
  const actionsContainer = document.getElementById("actions");
  if (!actionsContainer) return;
  actionsContainer.innerHTML = `<div class="loading-placeholder">Chargement des boutons…</div>`;

  try {
    const response = await fetch(`${API_BASE_URL}/getButtonsPerUser.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_token: sessionToken }),
    });
    const data = await response.json();

    if (!data.success) {
      actionsContainer.innerHTML = `<div class="error-placeholder">${data.error || "Aucune action disponible"}</div>`;
      return;
    }

    const buttons: ClientButton[] = data.buttons || [];
    if (buttons.length === 0) {
      actionsContainer.innerHTML = `<div class="empty-placeholder">Aucun bouton configuré pour ce client.</div>`;
      return;
    }

    actionsContainer.innerHTML = "";
    buttons.forEach((buttonData) => {
      const button = document.createElement("button");
      button.className = "action-btn";
      button.setAttribute("type", "button");
      button.setAttribute("data-label", buttonData.label);
      button.setAttribute("data-event-name", buttonData.event_name);
      button.style.backgroundColor = buttonData.bg_color || "#2563eb";
      button.style.color = buttonData.text_color || "#ffffff";
      button.onclick = () => handleAction(button);

      button.innerHTML = `
        <div class="btn-icon">${getIconHtml(buttonData.icon)}</div>
        <span class="btn-title">${buttonData.label || "Action"}</span>
        <span class="btn-arrow">›</span>
      `;

      actionsContainer.appendChild(button);
    });
  } catch (err) {
    console.error("[Diva] Erreur récupération boutons :", err);
    actionsContainer.innerHTML = `<div class="error-placeholder">Erreur de chargement des boutons</div>`;
  }
}

// ─────────────────────────────────────────────
//  UTILISATEUR
// ─────────────────────────────────────────────
function getIconHtml(iconClass: string | undefined): string {
  const key = (iconClass || "fas fa-tag").split(" ").pop()?.replace("fa-", "") || "tag";
  switch (key) {
    case "tag":
      return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.59 13.41L10.34 3.17A2 2 0 0 0 8.34 2H4c-1.1 0-2 .9-2 2v4.34c0 .53.21 1.04.59 1.41l10.25 10.25c.78.78 2.05.78 2.83 0l4.88-4.88a2 2 0 0 0 0-2.83zM7 7.5A1.5 1.5 0 1 1 8.5 6 1.5 1.5 0 0 1 7 7.5z"/></svg>`;
    case "link":
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 1 7.07 0l1.41 1.41a5 5 0 0 1 0 7.07 5 5 0 0 1-7.07 0L9.35 18.3"/><path d="M14 11a5 5 0 0 0-7.07 0L5.51 12.41a5 5 0 0 0 0 7.07 5 5 0 0 0 7.07 0L14 18.3"/></svg>`;
    case "star":
      return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.45-6.18L22 9.24l-6.36-.55L12 3 8.36 8.69 2 9.24l5.27 5.58L5.82 21z"/></svg>`;
    case "heart":
      return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6.42 3.42 5 5.5 5A4.5 4.5 0 0 1 12 9.09 4.5 4.5 0 0 1 18.5 5C20.58 5 22 6.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    case "check":
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>`;
    case "envelope":
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16v16H4z"/><polyline points="22,6 12,13 2,6"/></svg>`;
    case "info-circle":
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    case "exclamation-triangle":
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    default:
      return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.59 13.41L10.34 3.17A2 2 0 0 0 8.34 2H4c-1.1 0-2 .9-2 2v4.34c0 .53.21 1.04.59 1.41l10.25 10.25c.78.78 2.05.78 2.83 0l4.88-4.88a2 2 0 0 0 0-2.83zM7 7.5A1.5 1.5 0 1 1 8.5 6 1.5 1.5 0 0 1 7 7.5z"/></svg>`;
  }
}

function getUserInfo(): { name: string; email: string } {
  // Ajout d'une sécurité au cas où le profil n'est pas encore chargé
  const profile = Office.context.mailbox?.userProfile;
  return {
    name: profile?.displayName || "Utilisateur",
    email: profile?.emailAddress || "",
  };
}

function getRealUserEmail(): Promise<string> {
  return new Promise((resolve) => {
    const profile = Office.context.mailbox?.userProfile;
    const profileEmail = profile?.emailAddress || "";
    const isTechnicalAlias = /^outlook_[A-F0-9]+@outlook\.com$/i.test(profileEmail);
    
    if (!isTechnicalAlias) { resolve(profileEmail); return; }
    
    if (Office.context.mailbox) {
        Office.context.mailbox.getUserIdentityTokenAsync((result: Office.AsyncResult<string>) => {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
              try {
                const tokenParts = result.value.split(".");
                const payload = JSON.parse(atob(tokenParts[1]));
                resolve(payload["preferred_username"] || payload["upn"] || payload["smtp"] || profileEmail);
              } catch (e) { resolve(profileEmail); }
            } else { resolve(profileEmail); }
          });
    } else {
        resolve(profileEmail);
    }
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
  const item = Office.context.mailbox?.item;
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
    const item = Office.context.mailbox?.item;
    const attachments = item?.attachments;
    if (!item || !attachments || attachments.length === 0) { resolve([]); return; }

    const fileAttachments = attachments.filter(
      (a: Office.AttachmentDetails) => a.attachmentType === Office.MailboxEnums.AttachmentType.File
    );
    if (fileAttachments.length === 0) { resolve([]); return; }

    const promises = fileAttachments.map(
      (attachment: Office.AttachmentDetails) =>
        new Promise<AttachmentData | null>((res) => {
          item.getAttachmentContentAsync(attachment.id, (result: Office.AsyncResult<Office.AttachmentContent>) => {
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
  const actionLabel  = btn.getAttribute("data-label") || "Action";
  const sessionToken = (window as any).__divaSessionToken;
  const userEmail    = (window as any).__divaUserEmail;
  const emailInfo    = getEmailInfo();
  const item         = Office.context.mailbox?.item;

  if (!actionLabel || !sessionToken || !item) {
    console.error("Action, Session ou Item manquant");
    return;
  }

  item.body.getAsync(Office.CoercionType.Text, async (result: Office.AsyncResult<string>) => {
    if (result.status === Office.AsyncResultStatus.Succeeded) {

      setStatus("loading", "Récupération des pièces jointes…");
      const attachments = await getAttachments();
      
      const payload = {
        session_token: sessionToken,
        user_email:    userEmail,
        sender_email:  emailInfo?.senderEmail,
        subject:       emailInfo?.subject,
        email_body:    btoa(unescape(encodeURIComponent(result.value))),
        action_label:  actionLabel,
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
};

// ─────────────────────────────────────────────
//  UTILITAIRES
// ─────────────────────────────────────────────
function setStatus(type: "ready" | "loading" | "error", message: string): void {
  const indicator = document.getElementById("status-indicator");
  const text      = document.getElementById("status");
  if (indicator) indicator.className = `status-indicator ${type}`;
  if (text)      text.textContent    = message;
}