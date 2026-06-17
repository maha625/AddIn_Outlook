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

const API_BASE_URL = "http://localhost/backend_addin";
const ICONS_BASE_URL = "http://localhost/icons/cors.php";

// ─────────────────────────────────────────────
//  ICÔNES
// ─────────────────────────────────────────────

function getIconHtml(iconFile: string | undefined, bgColor: string = "#2563eb"): string {
  if (!iconFile) {
    return `<span style="display:inline-block;width:16px;height:16px;"></span>`;
  }
  const url = `${ICONS_BASE_URL}?file=${iconFile}`;
  return `<img src="${url}" alt="" style="width:16px; height:16px; filter:brightness(0); opacity: 0.6; vertical-align:middle; flex-shrink:0;" />`;
}

function getIconFilter(bgHex: string): string {
  const clean = bgHex.replace("#", "");
  if (clean.length < 6) return "brightness(0) invert(1)";
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5
    ? "brightness(0)"
    : "brightness(0) invert(1)";
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
      button.setAttribute("data-icon", buttonData.icon || "tag.svg");
      button.setAttribute("data-dolibarr-type-code", buttonData.dolibarr_type_code || "");
      button.setAttribute("data-allow-linked", buttonData.allow_linked_events.toString());
      button.style.backgroundColor = buttonData.bg_color || "#2563eb";
      button.style.color = buttonData.text_color || "#ffffff";
      button.onclick = () => handleAction(button);

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
  const senderEl = document.getElementById("sender-email");
  if (subjectEl) subjectEl.textContent = email.subject;
  if (senderEl) senderEl.textContent = email.senderEmail;
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
  const actionLabel = btn.getAttribute("data-label") || "Action";
  const dolibarrType = btn.getAttribute("data-dolibarr-type-code") || null;
  const allowLinked = btn.getAttribute("data-allow-linked") === "1";
  const sessionToken = (window as any).__divaSessionToken;
  const emailInfo = getEmailInfo();
  const item = Office.context.mailbox?.item;

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

  const parentBgColor = btn.style.backgroundColor || "#0078d4";
  const parentTextColor = btn.style.color || "#ffffff";

  actionsContainer.innerHTML = `
  <style>
    body, html {
      overflow: hidden !important;
    }
    .panel-container {
      padding: 24px 16px;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #242424;
      box-sizing: border-box;
    }

    /* Bouton Retour */
    .btn-back {
      border: none;
      background: none;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      padding: 0;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .btn-back:hover {
      filter: brightness(0.85);
      transform: translateX(-2px);
    }

    /* Bouton Créer Principal */
    .btn-primary {
      width: 100%;
      padding: 13px 20px;
      background: ${parentBgColor};
      color: ${parentTextColor};
      border: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      margin-bottom: 24px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
    }
    .btn-primary:hover {
      filter: brightness(0.85);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }
    .btn-primary:active {
      transform: scale(0.98);
    }

    /* Séparateur textuel */
    .divider-container {
      display: flex;
      align-items: center;
      margin-bottom: 24px;
    }
    .divider-line {
      flex: 1;
      border-bottom: 1px solid #e0e0e0;
    }
    .divider-text {
      padding: 0 12px;
      color: #616161;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Carte de liaison */
    .card {
      background: #ffffff;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.03);
      border: 1px solid #e0e0e0;
    }

    /* Checkbox & Labels */
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
      font-size: 13px;
      color: #242424;
      cursor: pointer;
      user-select: none;
    }
    .checkbox-input {
      width: 16px;
      height: 16px;
      accent-color: ${parentBgColor};
      cursor: pointer;
      margin: 0;
      border: 1px solid #8a8886;
      border-radius: 3px;
    }
    .field-label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #424242;
      margin-bottom: 8px;
    }

    /* Conteneur Recherche Hybride */
    .search-container {
      position: relative;
      margin-bottom: 24px;
    }
    .search-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #adadad;
      border-radius: 6px;
      font-size: 13px;
      font-family: inherit;
      background: #ffffff;
      color: #242424;
      outline: none;
      box-sizing: border-box;
      transition: all 0.2s ease;
      cursor: text;
    }
    .search-input:focus {
      border-color: ${parentBgColor};
      box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.05);
    }
    .search-input:disabled {
      background: #f5f5f5;
      cursor: not-allowed;
    }

    /* Liste de résultats — s'ouvre vers le HAUT */
    .dropdown-list {
      position: absolute;
      
      bottom: 100%;
      top: auto;
      left: 0;
      right: 0;
      background: #ffffff;
      border: 1px solid #adadad;
      border-radius: 6px;
      max-height: 220px;
      overflow-y: auto;
      z-index: 1000;
      box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
      display: none;
      margin-top: 0;
      margin-bottom: 4px;
      padding: 0;
      list-style: none;
    }
    .dropdown-item {
      padding: 10px 12px;
      font-size: 13px;
      cursor: pointer;
      color: #242424;
      transition: background 0.1s ease;
    }
    .dropdown-item:hover {
      background: #f3f2f1;
    }
    .dropdown-item.no-result {
      color: #a19f9d;
      cursor: default;
      background: transparent !important;
    }

    /* Bouton Soumettre / Lier */
    .btn-submit {
      width: 100%;
      padding: 13px;
      background: #f0f0f0;
      color: #a19f9d;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      font-weight: 600;
      font-size: 14px;
      cursor: not-allowed;
      transition: all 0.2s ease;
    }
    .btn-submit:not(:disabled) {
      background: ${parentBgColor};
      color: ${parentTextColor};
      border-color: transparent;
      cursor: pointer;
    }
    .btn-submit:hover:not(:disabled) {
      filter: brightness(0.85);
    }
  </style>

  <div class="panel-container">

    <button onclick="location.reload()" class="btn-back">
      <span>←</span> Retour aux actions
    </button>

    <button id="opt-new" class="btn-primary">
      + Créer un nouvel événement
    </button>

    <div class="divider-container">
      <div class="divider-line"></div>
      <span class="divider-text">Ou lier à l'existant</span>
      <div class="divider-line"></div>
    </div>

    <div class="card">

      <label class="checkbox-label">
        <input type="checkbox" id="show-all-events" class="checkbox-input" />
        <span style="font-weight: 500;">Inclure les événements terminés</span>
      </label>

      <label class="field-label">Événements récents du client</label>

      <div class="search-container">
        <input type="text" id="event-search" class="search-input" placeholder="Chargement..." autocomplete="off" disabled />
        <ul id="event-list" class="dropdown-list"></ul>
      </div>

      <input type="hidden" id="selected-event-id" value="" />

      <button id="btn-link-submit" disabled class="btn-submit">
        Lier à cet événement
      </button>
    </div>

  </div>
`;

  const searchInput = document.getElementById("event-search") as HTMLInputElement;
  const eventList = document.getElementById("event-list") as HTMLUListElement;
  const hiddenInput = document.getElementById("selected-event-id") as HTMLInputElement;
  const submitBtn = document.getElementById("btn-link-submit") as HTMLButtonElement;
  const checkboxShowAll = document.getElementById("show-all-events") as HTMLInputElement;

  let localEventsCache: any[] = [];

  document.getElementById("opt-new")!.onclick = () => processCreateNewEvent(btn, tiersId);

  function renderDropdownList(filterText: string = "") {
    eventList.innerHTML = "";
    const searchLower = filterText.toLowerCase().trim();

    const filtered = localEventsCache.filter((ev: any) => {
      const label = (ev.label || "").toLowerCase();
      const dateStr = ev.date_event ? new Date(ev.date_event).toLocaleDateString().toLowerCase() : "";
      return label.includes(searchLower) || dateStr.includes(searchLower);
    });

    if (filtered.length === 0) {
      eventList.innerHTML = `<li class="dropdown-item no-result">Aucun événement trouvé</li>`;
      return;
    }

    filtered.forEach((ev: any) => {
      const li = document.createElement("li");
      li.className = "dropdown-item";
      const formattedDate = ev.date_event ? new Date(ev.date_event).toLocaleDateString() : 'Date inconnue';
      li.textContent = `${ev.label} (${formattedDate})`;

      li.onclick = (e) => {
        e.stopPropagation();
        searchInput.value = `${ev.label} (${formattedDate})`;
        hiddenInput.value = ev.id.toString();
        submitBtn.disabled = false;
        eventList.style.display = "none";
      };
      eventList.appendChild(li);
    });
  }

  async function loadDropdownEvents(showAll: boolean) {
    searchInput.placeholder = "Chargement...";
    searchInput.disabled = true;
    searchInput.value = "";
    eventList.style.display = "none";
    submitBtn.disabled = true;
    hiddenInput.value = "";
    localEventsCache = [];

    try {
      const response = await fetch(`${API_BASE_URL}/evenement/getTiersEvents.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_token: sessionToken,
          socid: tiersId,
          show_all: showAll
        }),
      });
      const data = await response.json();

      if (data.success && data.events && data.events.length > 0) {
        localEventsCache = data.events;
        searchInput.placeholder = "Rechercher ou sélectionner...";
        searchInput.disabled = false;
      } else {
        searchInput.placeholder = "Aucun événement disponible";
      }
    } catch (err) {
      searchInput.placeholder = "Erreur de chargement réseau";
    }
  }

  await loadDropdownEvents(false);

  searchInput.addEventListener("focus", () => {
    if (localEventsCache.length > 0) {
      renderDropdownList(searchInput.value);
      eventList.style.display = "block";
    }
  });

  searchInput.addEventListener("input", () => {
    hiddenInput.value = "";
    submitBtn.disabled = true;
    eventList.style.display = "block";
    renderDropdownList(searchInput.value);
  });

  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".search-container")) {
      eventList.style.display = "none";
    }
  });

  if (checkboxShowAll) {
    checkboxShowAll.addEventListener("change", () => {
      loadDropdownEvents(checkboxShowAll.checked);
    });
  }

  submitBtn.onclick = () => {
    const parentId = parseInt(hiddenInput.value);
    if (!isNaN(parentId)) {
      processCreateNewEvent(btn, tiersId, parentId);
    }
  };
}

async function processCreateNewEvent(
  btn: HTMLButtonElement,
  tiersId: number | null,
  parentId: number | null = null
): Promise<void> {
  const actionLabel = btn.getAttribute("data-label")!;
  const dolibarrType = btn.getAttribute("data-dolibarr-type-code");
  const sessionToken = (window as any).__divaSessionToken;
  const userEmail = (window as any).__divaUserEmail;
  const emailInfo = getEmailInfo();
  const item = Office.context.mailbox.item;

  if (!item) return;

  item.body.getAsync(Office.CoercionType.Text, async (result: Office.AsyncResult<string>) => {
    if (result.status === Office.AsyncResultStatus.Succeeded) {
      const attachments = await getAttachments();
      const payload = {
        session_token: sessionToken,
        user_email: userEmail,
        sender_email: emailInfo?.senderEmail,
        subject: emailInfo?.subject,
        email_body: btoa(unescape(encodeURIComponent(result.value))),
        action_label: actionLabel,
        dolibarr_type_code: dolibarrType,
        attachments: attachments,
        socid: tiersId,
        parent_event_id: parentId,
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
          setStatus("ready", "Événement traité !");
          setTimeout(() => location.reload(), 2000); // ← retour auto après 2s
        } else {
          setStatus("error", data.error || "Échec");
        }
      } catch (err) {
        setStatus("error", "Erreur réseau");
      }
    }
  });
}

// ─────────────────────────────────────────────
//  UTILITAIRES
// ─────────────────────────────────────────────

// Timer global pour l'auto-effacement des statuts
let statusTimeout: ReturnType<typeof setTimeout> | null = null;

function setStatus(type: "ready" | "loading" | "error", message: string): void {
  const indicator = document.getElementById("status-indicator");
  const text = document.getElementById("status");
  if (indicator) indicator.className = `status-indicator ${type}`;
  if (text) text.textContent = message;

  // Annule le timer précédent si un nouveau message arrive avant 3s
  if (statusTimeout) clearTimeout(statusTimeout);

  // "loading" reste affiché jusqu'à la prochaine mise à jour
  if (type !== "loading") {
    statusTimeout = setTimeout(() => {
      if (indicator) indicator.className = "status-indicator";
      if (text) text.textContent = "";
    }, 5000);
  }
}