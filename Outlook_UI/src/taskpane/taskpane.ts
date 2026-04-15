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
        <div class="btn-icon">${buttonData.icon || ""}</div>
        <span class="btn-title">${buttonData.label}</span>
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