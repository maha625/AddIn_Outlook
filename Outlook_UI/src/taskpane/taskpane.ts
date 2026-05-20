/// <reference types="@types/office-js" />

interface ClientButton {
  id: number;
  client_id: number;
  label: string;
  bg_color: string;
  text_color: string;
  icon: string;
  dolibarr_type_code: string | null;
  allow_linked_events: boolean;
}

const API_BASE_URL = "http://localhost/backend/backend_AddIn";
const ICONS_BASE_URL = "http://localhost/addin_icons/cors.php";
// ─────────────────────────────────────────────
//  ICÔNES
// ─────────────────────────────────────────────

/**
 * Retourne le HTML d'une icône depuis le dossier /icons/.
 * @param iconFile  - nom du fichier ex: "tag.svg" ou "telephone.png"
 * @param bgColor   - couleur hex du FOND du bouton (pour calculer le contraste)
 */
function getIconHtml(iconFile: string | undefined, bgColor: string = "#2563eb"): string {
  if (!iconFile) {
    return `<span style="display:inline-block;width:16px;height:16px;"></span>`;
  }
  const url = `${ICONS_BASE_URL}?file=${iconFile}`;

  // ── Filtre simplifié : on force l'icône en noir (brightness(0)) ──
  // et on réduit son opacité pour l'adoucir un peu comme le fond gris.
  return `<img src="${url}" alt="" style="width:16px; height:16px; filter:brightness(0); opacity: 0.6; vertical-align:middle; flex-shrink:0;" />`;
}
/**
 * Calcule le filtre CSS pour coloriser une icône selon la luminance du FOND.
 * - fond clair  → icône sombre  : brightness(0)
 * - fond sombre → icône blanche : brightness(0) invert(1)
 */
function getIconFilter(bgHex: string): string {
  const clean = bgHex.replace("#", "");
  if (clean.length < 6) return "brightness(0) invert(1)";
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5
    ? "brightness(0)"            // fond clair  → icône sombre (visible)
    : "brightness(0) invert(1)"; // fond sombre → icône blanche (visible)
}

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
      (window as any).__divaUserEmail    = userEmail;
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
      button.setAttribute("type",                    "button");
      button.setAttribute("data-label",              buttonData.label);
      button.setAttribute("data-icon",               buttonData.icon || "tag.svg");
      button.setAttribute("data-dolibarr-type-code", buttonData.dolibarr_type_code || "");
      button.setAttribute("data-allow-linked",       buttonData.allow_linked_events.toString());
      button.style.backgroundColor = buttonData.bg_color   || "#2563eb";
      button.style.color           = buttonData.text_color || "#ffffff";
      button.onclick = () => handleAction(button);

      // ── Filtre calculé sur bg_color (contraste fond/icône) ──
      button.innerHTML = `
        <div class="btn-icon">${getIconHtml(buttonData.icon, buttonData.bg_color)}</div>
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
function getUserInfo(): { name: string; email: string } {
  const profile = Office.context.mailbox?.userProfile;
  return {
    name:  profile?.displayName  || "Utilisateur",
    email: profile?.emailAddress || "",
  };
}

function getRealUserEmail(): Promise<string> {
  return new Promise((resolve) => {
    const profile      = Office.context.mailbox?.userProfile;
    const profileEmail = profile?.emailAddress || "";
    const isTechnicalAlias = /^outlook_[A-F0-9]+@outlook\.com$/i.test(profileEmail);

    if (!isTechnicalAlias) { resolve(profileEmail); return; }

    if (Office.context.mailbox) {
      Office.context.mailbox.getUserIdentityTokenAsync((result: Office.AsyncResult<string>) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          try {
            const tokenParts = result.value.split(".");
            const payload    = JSON.parse(atob(tokenParts[1]));
            resolve(payload["preferred_username"] || payload["upn"] || payload["smtp"] || profileEmail);
          } catch { resolve(profileEmail); }
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
    subject:     item.subject || "(Sans objet)",
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
  content: string;
  contentType: string;
  size: number;
}

function getAttachments(): Promise<AttachmentData[]> {
  return new Promise((resolve) => {
    const item        = Office.context.mailbox?.item;
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
                name:        attachment.name,
                content:     result.value.content,
                contentType: attachment.contentType || "application/octet-stream",
                size:        attachment.size,
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
//  VÉRIFICATION TIERS
// ─────────────────────────────────────────────
interface TiersCheckResponse {
  status: string;
  found: boolean;
  name?: string;
  id?: number;
  matched_via?: string;
  message?: string;
  reason?: string;
}

async function checkSenderIsClient(
  sessionToken: string,
  senderEmail: string
): Promise<TiersCheckResponse> {
  const response = await fetch(`${API_BASE_URL}/tiers/checkTiersByDomain.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_token: sessionToken, sender_email: senderEmail }),
  });
  return response.json();
}

// ─────────────────────────────────────────────
//  ACTION — Envoi vers Dolibarr
// ─────────────────────────────────────────────
async function handleAction(btn: HTMLButtonElement): Promise<void> {
  const actionLabel  = btn.getAttribute("data-label")              || "Action";
  const dolibarrType = btn.getAttribute("data-dolibarr-type-code") || null;
  const allowLinked  = btn.getAttribute("data-allow-linked") === "1";
  const sessionToken = (window as any).__divaSessionToken;
  const emailInfo    = getEmailInfo();
  const item         = Office.context.mailbox?.item;

  if (!actionLabel || !sessionToken || !item) return;

  const senderEmail = emailInfo?.senderEmail || "";
  setStatus("loading", "Vérification du client…");

  try {
    const tiersCheck = await checkSenderIsClient(sessionToken, senderEmail);
    if (!tiersCheck.found) {
      setStatus("error", "Client non trouvé");
      return;
    }

    const tiersId = tiersCheck.id || null;
    setStatus("ready", "Client vérifié"); 

    if (allowLinked && tiersId) {
      showSelectionModal(btn, tiersId, sessionToken);
    } else {
      processCreateNewEvent(btn, tiersId);
    }
  } catch (err) {
    setStatus("error", "Erreur de vérification");
  }
}

async function showSelectionModal(btn: HTMLButtonElement, tiersId: number, sessionToken: string) {
  const actionsContainer = document.getElementById("actions");
  if (!actionsContainer) return;

  actionsContainer.innerHTML = `
    <div style="padding: 20px; font-family: 'Segoe UI', system-ui, sans-serif; color: #323130; background: #faf9f8; min-height: 100vh;">

      <button onclick="location.reload()" style="border:none; background:none; color:#0078d4; cursor:pointer; font-size:13px; font-weight:600; padding:0; margin-bottom:20px; display:flex; align-items:center; gap:5px;">
        <span style="font-size:18px;">←</span> Retour aux actions
      </button>

      <button id="opt-new" style="width:100%; padding:14px; background:#0078d4; color:white; border:none; border-radius:6px; font-weight:600; font-size:14px; cursor:pointer; margin-bottom:25px; box-shadow: 0 4px 6px rgba(0,120,212,0.2); transition: all 0.2s;">
        + Créer un nouvel événement
      </button>

      <div style="display:flex; align-items:center; margin-bottom:20px;">
        <div style="flex:1; border-bottom:1px solid #edebe9;"></div>
        <span style="padding:0 15px; color:#a19f9d; font-size:11px; font-weight:700; text-transform:uppercase;">Ou lier à l'existant</span>
        <div style="flex:1; border-bottom:1px solid #edebe9;"></div>
      </div>

      <div style="background: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #edebe9;">
        <label style="display:block; font-size:12px; font-weight:600; color:#605e5c; margin-bottom:8px;">Événements récents du client</label>
        <select id="event-dropdown" style="width:100%; padding:12px; border:1px solid #d2d0ce; border-radius:4px; font-size:14px; background:#fff; color:#323130; outline:none; margin-bottom:15px;">
          <option value="">Chargement...</option>
        </select>
        <button id="btn-link-submit" disabled style="width:100%; padding:12px; background:#f3f2f1; color:#a19f9d; border:none; border-radius:4px; font-weight:600; font-size:14px; cursor:not-allowed; transition: all 0.3s;">
          Lier à cet événement
        </button>
      </div>

    </div>
  `;

  const dropdown  = document.getElementById("event-dropdown")  as HTMLSelectElement;
  const submitBtn = document.getElementById("btn-link-submit") as HTMLButtonElement;

  document.getElementById("opt-new")!.onclick = () => processCreateNewEvent(btn, tiersId);
  const btnNew = document.getElementById("opt-new") as HTMLButtonElement;
  btnNew.onmouseover = () => btnNew.style.backgroundColor = "#005a9e";
  btnNew.onmouseout  = () => btnNew.style.backgroundColor = "#0078d4";

  try {
    const response = await fetch(`${API_BASE_URL}/evenement/getTiersEvents.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_token: sessionToken, socid: tiersId }),
    });
    const data = await response.json();

    if (data.success && data.events.length > 0) {
      dropdown.innerHTML = '<option value="">-- Sélectionner un événement --</option>';
      data.events.forEach((ev: any) => {
        const opt = document.createElement("option");
        opt.value = ev.id;
        opt.textContent = `${ev.label} (${new Date(ev.date_event).toLocaleDateString()})`;
        dropdown.appendChild(opt);
      });

      dropdown.onchange = () => {
        if (dropdown.value !== "") {
          submitBtn.disabled = false;
          submitBtn.style.backgroundColor = "#0078d4";
          submitBtn.style.color           = "white";
          submitBtn.style.cursor          = "pointer";
        } else {
          submitBtn.disabled = true;
          submitBtn.style.backgroundColor = "#f3f2f1";
          submitBtn.style.color           = "#a19f9d";
          submitBtn.style.cursor          = "not-allowed";
        }
      };

      submitBtn.onclick = () => processCreateNewEvent(btn, tiersId, parseInt(dropdown.value));
    } else {
      dropdown.innerHTML = '<option value="">Aucun événement trouvé</option>';
    }
  } catch (err) {
    dropdown.innerHTML = '<option value="">Erreur de connexion</option>';
  }
}

async function processCreateNewEvent(
  btn: HTMLButtonElement,
  tiersId: number | null,
  parentId: number | null = null
): Promise<void> {
  const actionLabel  = btn.getAttribute("data-label")!;
  const dolibarrType = btn.getAttribute("data-dolibarr-type-code");
  const sessionToken = (window as any).__divaSessionToken;
  const userEmail    = (window as any).__divaUserEmail;
  const emailInfo    = getEmailInfo();
  const item         = Office.context.mailbox.item;

  if (!item) return;

  item.body.getAsync(Office.CoercionType.Text, async (result: Office.AsyncResult<string>) => {
    if (result.status === Office.AsyncResultStatus.Succeeded) {
      const attachments = await getAttachments();
      const payload = {
        session_token:      sessionToken,
        user_email:         userEmail,
        sender_email:       emailInfo?.senderEmail,
        subject:            emailInfo?.subject,
        email_body:         btoa(unescape(encodeURIComponent(result.value))),
        action_label:       actionLabel,
        dolibarr_type_code: dolibarrType,
        attachments:        attachments,
        socid:              tiersId,
        parent_event_id:    parentId,
      };

      try {
        setStatus("loading", "Envoi à Dolibarr...");
        const response = await fetch(`${API_BASE_URL}/evenement/create_event.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (data.success) setStatus("ready", "Événement traité !");
        else              setStatus("error", data.error || "Échec");
      } catch (err) {
        setStatus("error", "Erreur réseau");
      }
    }
  });
}

// ─────────────────────────────────────────────
//  UTILITAIRES
// ─────────────────────────────────────────────
function setStatus(type: "ready" | "loading" | "error", message: string): void {
  const indicator = document.getElementById("status-indicator");
  const text      = document.getElementById("status");
  if (indicator) indicator.className = `status-indicator ${type}`;
  if (text)      text.textContent    = message;
}