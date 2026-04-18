// frontend_admin/src/pages/AddButtonsToExisting.jsx
import React, { useState, useEffect, useCallback } from "react";
import { API_BACK_URL } from "../config/config";
import "./AddButtonsToExisting.css";

const FALLBACK_TYPE = "AC_OTH";

const ICON_OPTIONS = [
  { label: "Étiquette",   value: "fas fa-tag" },
  { label: "Lien",        value: "fas fa-link" },
  { label: "Étoile",      value: "fas fa-star" },
  { label: "Cœur",        value: "fas fa-heart" },
  { label: "Check",       value: "fas fa-check" },
  { label: "Email",       value: "fas fa-envelope" },
  { label: "Info",        value: "fas fa-info-circle" },
  { label: "Utilisateur", value: "fas fa-user" },
  { label: "Panier",      value: "fas fa-shopping-cart" },
  { label: "Alerte",      value: "fas fa-exclamation-triangle" },
];

const DEFAULT_BUTTON = {
  label: "",
  event_name: "",
  bg_color: "#2563eb",
  text_color: "#ffffff",
  icon: "fas fa-tag",
  dolibarr_type_code: "", // "" = inherit client default
};

export default function AddButtonsToExisting() {
  const [clients, setClients]                   = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");

  const [eventTypes, setEventTypes]     = useState([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [typesError, setTypesError]     = useState("");

  const [clientDefault, setClientDefault] = useState("");

  const [buttons, setButtons] = useState([{ ...DEFAULT_BUTTON }]);
  const [saving, setSaving]   = useState(false);
  const [message, setMessage] = useState("");

  // ── Load client list ─────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BACK_URL}/getClients.php`)
      .then((r) => r.json())
      .then((d) => setClients(d.clients ?? d))
      .catch(() => setClients([]));
  }, []);

  // ── Fetch Dolibarr event types whenever client changes ───────────────────
  const fetchTypes = useCallback(async (clientId) => {
    if (!clientId) { setEventTypes([]); setClientDefault(""); return; }
    setTypesLoading(true);
    setTypesError("");
    try {
      const res  = await fetch(`${API_BACK_URL}/getDolibarrEventTypes.php?client_id=${clientId}`);
      const json = await res.json();
      if (json.success) {
        setEventTypes(json.types ?? []);
        setClientDefault(json.client_default ?? "");
      } else {
        setTypesError(json.error ?? "Impossible de récupérer les types Dolibarr");
        setEventTypes([]);
      }
    } catch {
      setTypesError("Erreur réseau lors du chargement des types");
      setEventTypes([]);
    } finally {
      setTypesLoading(false);
    }
  }, []);

  const handleClientChange = (e) => {
    const id = e.target.value;
    setSelectedClientId(id);
    setMessage("");
    fetchTypes(id);
  };

  // ── Button helpers ───────────────────────────────────────────────────────
  const updateButton = (index, field, value) =>
    setButtons((prev) =>
      prev.map((btn, i) => (i === index ? { ...btn, [field]: value } : btn))
    );

  const addButton    = () => setButtons((prev) => [...prev, { ...DEFAULT_BUTTON }]);
  const removeButton = (index) => setButtons((prev) => prev.filter((_, i) => i !== index));

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedClientId) { setMessage("Veuillez sélectionner un client."); return; }
    setSaving(true);
    setMessage("");
    try {
      const res  = await fetch(`${API_BACK_URL}/addButtons.php`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: selectedClientId,
          default_dolibarr_type_code: clientDefault || null,
          buttons,
        }),
      });
      const json = await res.json();
      setMessage(json.success ? "✅ Boutons enregistrés." : `❌ ${json.error}`);
    } catch {
      setMessage("❌ Erreur réseau.");
    } finally {
      setSaving(false);
    }
  };

  // ── Reusable Dolibarr type <select> ──────────────────────────────────────
  const TypeSelect = ({ value, onChange, placeholder = "Hériter du défaut client" }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="type-select"
      disabled={typesLoading}
    >
      <option value="">{typesLoading ? "Chargement…" : placeholder}</option>
      {eventTypes.map((t) => (
        <option key={t.code} value={t.code}>
          {t.label} ({t.code})
        </option>
      ))}
    </select>
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="add-buttons-wrapper">
      <div className="add-buttons-card">
        <h2>Ajouter des boutons à un client</h2>

        {/* ── Client selector ── */}
        <div className="form-section">
          <label>Sélectionner le Client</label>
          <select
            className="client-select"
            value={selectedClientId}
            onChange={handleClientChange}
          >
            <option value="">— Sélectionner un client —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.username ?? `Client #${c.id}`}
              </option>
            ))}
          </select>
        </div>

        {/* ── Client-level default type ── */}
        {selectedClientId && (
          <div className="form-section">
            <label>Type d'événement par défaut (Fallback)</label>
            {typesError ? (
              <p className="alert error">{typesError}</p>
            ) : (
              <TypeSelect
                value={clientDefault}
                onChange={setClientDefault}
                placeholder={`Aucun défaut (fallback : ${FALLBACK_TYPE})`}
              />
            )}
          </div>
        )}

        {/* ── Button list ── */}
        <div className="buttons-config-container">
          {buttons.map((btn, index) => (
            <div key={index} className="btn-edit-card">

              {/* Card header */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
                <span style={{ fontWeight: 700 }}>Configuration Bouton {index + 1}</span>
                {buttons.length > 1 && (
                  <button className="btn-del" onClick={() => removeButton(index)}>✕</button>
                )}
              </div>

              {/* Label + event name */}
              <div className="inputs-main">
                <input
                  type="text"
                  value={btn.label}
                  onChange={(e) => updateButton(index, "label", e.target.value)}
                  placeholder="Label (ex : Devis)"
                />
                <input
                  type="text"
                  value={btn.event_name}
                  onChange={(e) => updateButton(index, "event_name", e.target.value)}
                  placeholder="Nom événement"
                />
              </div>

              {/* Icon selector + Dolibarr type — second row */}
              <div className="inputs-main" style={{ marginTop: "10px" }}>
                <select
                  className="icon-select"
                  value={btn.icon}
                  onChange={(e) => updateButton(index, "icon", e.target.value)}
                >
                  {ICON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {typesError ? (
                  <p className="alert error" style={{ margin: 0 }}>{typesError}</p>
                ) : (
                  <TypeSelect
                    value={btn.dolibarr_type_code}
                    onChange={(v) => updateButton(index, "dolibarr_type_code", v)}
                  />
                )}
              </div>

              {/* Resolved type preview */}
              <small className="type-preview" style={{ display: "block", marginTop: "6px" }}>
                → sera envoyé comme :{" "}
                <strong>{btn.dolibarr_type_code || clientDefault || FALLBACK_TYPE}</strong>
              </small>

              {/* Colors + live button preview */}
              <div className="color-controls">
                <div className="color-group">
                  <div className="color-field">
                    <label>Fond</label>
                    <input
                      type="color"
                      value={btn.bg_color}
                      onChange={(e) => updateButton(index, "bg_color", e.target.value)}
                    />
                  </div>
                  <div className="color-field">
                    <label>Texte</label>
                    <input
                      type="color"
                      value={btn.text_color}
                      onChange={(e) => updateButton(index, "text_color", e.target.value)}
                    />
                  </div>
                </div>

                <button
                  className="real-preview-btn"
                  style={{ backgroundColor: btn.bg_color, color: btn.text_color }}
                >
                  <i className={btn.icon}></i> {btn.label || "Aperçu"}
                </button>
              </div>

            </div>
          ))}
        </div>

        <button
          className="btn-add-row"
          style={{ width: "100%", marginTop: "20px" }}
          onClick={addButton}
        >
          + Ajouter un autre bouton
        </button>

        <button
          className="btn-save-all"
          onClick={handleSave}
          disabled={saving || !selectedClientId}
        >
          {saving ? "Enregistrement en cours..." : "Enregistrer toutes les configurations"}
        </button>

        {message && (
          <div className={`alert ${message.includes("✅") ? "success" : "error"}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}