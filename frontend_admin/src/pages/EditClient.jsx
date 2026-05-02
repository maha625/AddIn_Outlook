import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BACK_URL } from "../config/config";
import "./EditClient.css";

const ICON_OPTIONS = [
  { label: "Étiquette",    value: "fas fa-tag" },
  { label: "Lien",         value: "fas fa-link" },
  { label: "Étoile",       value: "fas fa-star" },
  { label: "Cœur",         value: "fas fa-heart" },
  { label: "Check",        value: "fas fa-check" },
  { label: "Info",         value: "fas fa-info-circle" },
  { label: "Utilisateur",  value: "fas fa-user" },
  { label: "Panier",       value: "fas fa-shopping-cart" },
];

export default function EditClient() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    site_number: "",
    email: "",
    dolibarr_url: "",
    token_url: "",
    username: "",
    password: "",
    dolibarr_api_key: "",
    domain: "",
    logo: "",
  });

  const [buttons,     setButtons]     = useState([]);
  const [eventTypes,  setEventTypes]  = useState([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [message,     setMessage]     = useState("");

  // ── 1. Load client data + buttons ────────────────────────────────────────
  useEffect(() => {
    const fetchClientDetails = async () => {
      try {
        const res = await axios.get(`${API_BACK_URL}/getClientDetails.php?id=${id}`);
        if (res.data.success) {
          const c = res.data.client;
          setForm({
            site_number:      c.site_number       || "",
            email:            c.email             || "",
            dolibarr_url:     c.dolibarr_url      || "",
            token_url:        c.token_url         || "",
            username:         c.username          || "",
            password:         c.password          || "",
            dolibarr_api_key: c.dolibarr_api_key  || "",
            domain:           c.domain            || "",
            logo:             c.logo              || "",
          });
          setButtons(
            (res.data.buttons || []).map(b => ({
              ...b,
              dolibarr_type_code: b.dolibarr_type_code ?? "",
            }))
          );
        } else {
          alert("Erreur: " + res.data.error);
        }
      } catch (err) {
        console.error("Erreur chargement client", err);
      } finally {
        setLoading(false);
      }
    };
    fetchClientDetails();
  }, [id]);

  // ── 2. Load event types depuis la DB (global, pas par client) ────────────
  useEffect(() => {
    setTypesLoading(true);
    fetch(`${API_BACK_URL}/getDolibarrEventTypes.php`)
      .then(r => r.json())
      .then(json => {
        if (json.success) setEventTypes(json.types ?? []);
      })
      .catch(() => {})
      .finally(() => setTypesLoading(false));
  }, []);

  // ── 3. Auto-fill domain from email ───────────────────────────────────────
  useEffect(() => {
    if (form.email?.includes("@")) {
      setForm(prev => ({ ...prev, domain: form.email.split("@")[1] }));
    }
  }, [form.email]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleButtonChange = (index, field, value) =>
    setButtons(prev =>
      prev.map((btn, i) => (i === index ? { ...btn, [field]: value } : btn))
    );

  const addButton = () =>
    setButtons(prev => [
      ...prev,
      { label: "", bg_color: "#2563eb", text_color: "#ffffff",
        icon: "fas fa-tag", dolibarr_type_code: "" },
    ]);

  const removeButton = (index) => {
    if (buttons.length > 1)
      setButtons(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BACK_URL}/updateClient.php`, {
        id,
        ...form,
        buttons,
      });
      if (res.data.success) {
        setMessage("✅ Configuration mise à jour avec succès !");
        setTimeout(() => navigate("/clients"), 2000);
      } else {
        setMessage("❌ Erreur : " + res.data.error);
      }
    } catch {
      setMessage("❌ Erreur réseau lors de la mise à jour");
    }
  };

  if (loading) return <div className="loader">Chargement...</div>;

  return (
    <div className="client-wrapper">
      <div className="client-card">
        <div className="header">
          <h2>Modifier le Client <span style={{ color: "#2563eb" }}>#{id}</span></h2>
          <p>Mettez à jour les accès et les boutons</p>
        </div>

        <form onSubmit={handleSubmit}>

          {/* ── Client fields ── */}
          <div className="input-grid">
            {[
              { name: "site_number",      label: "N° de site",                  type: "text"  },
              { name: "email",            label: "Email Contact",                type: "email" },
              { name: "dolibarr_url",     label: "URL Dolibarr",                 type: "url"   },
              { name: "token_url",        label: "URL Token",                    type: "url"   },
              { name: "username",         label: "Nom d'utilisateur",            type: "text"  },
              { name: "password",         label: "Mot de passe",                 type: "text"  },
              { name: "dolibarr_api_key", label: "Clé API Dolibarr",             type: "text"  },
              { name: "domain",           label: "Domaine (ex: entreprise.com)", type: "text"  },
              { name: "logo",             label: "URL Logo Client",              type: "url"   },
            ].map(({ name, label, type }) => (
              <div className="input-group" key={name}>
                <label>{label}</label>
                <input
                  type={type} name={name} value={form[name]}
                  onChange={handleChange} required
                />
              </div>
            ))}
          </div>

          <hr className="divider" />

          {/* ── Buttons ── */}
          <div className="buttons-config-section">
            <div className="section-header">
              <h3>Boutons de l'Add-in</h3>
              <button type="button" className="add-btn-row" onClick={addButton}>
                + Ajouter un bouton
              </button>
            </div>

            {buttons.map((btn, index) => (
              <div key={index} className="button-row-container">
                <div className="button-row">

                  {/* Label */}
                  <div className="btn-input">
                    <label>Libellé</label>
                    <input
                      type="text" value={btn.label} required
                      onChange={e => handleButtonChange(index, "label", e.target.value)}
                    />
                  </div>

                  {/* Icon */}
                  <div className="btn-input">
                    <label>Icône</label>
                    <select
                      value={btn.icon} className="icon-select"
                      onChange={e => handleButtonChange(index, "icon", e.target.value)}
                    >
                      {ICON_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Dolibarr type */}
                  <div className="btn-input">
                    <label>Type Dolibarr</label>
                    <select
                      value={btn.dolibarr_type_code ?? ""}
                      className="icon-select"
                      disabled={typesLoading}
                      onChange={e => handleButtonChange(index, "dolibarr_type_code", e.target.value)}
                    >
                      <option value="">
                        {typesLoading ? "Chargement…" : "Fallback (AC_OTH)"}
                      </option>
                      {eventTypes.map(t => (
                        <option key={t.code} value={t.code}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Colors */}
                  <div className="btn-input tiny">
                    <label>Fond</label>
                    <input type="color" value={btn.bg_color}
                      onChange={e => handleButtonChange(index, "bg_color", e.target.value)} />
                  </div>
                  <div className="btn-input tiny">
                    <label>Texte</label>
                    <input type="color" value={btn.text_color}
                      onChange={e => handleButtonChange(index, "text_color", e.target.value)} />
                  </div>

                  {/* Live preview */}
                  <div className="btn-preview-mini">
                    <label>Rendu</label>
                    <div className="preview-box"
                      style={{ backgroundColor: btn.bg_color, color: btn.text_color }}>
                      <i className={btn.icon}
                        style={{ marginRight: btn.label ? "8px" : "0" }}></i>
                      <span>{btn.label || "Aperçu"}</span>
                    </div>
                  </div>

                  {buttons.length > 1 && (
                    <button type="button" className="delete-btn"
                      onClick={() => removeButton(index)}>
                      &times;
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {message && (
            <p className={`message ${message.includes("✅") ? "success" : "error"}`}>
              {message}
            </p>
          )}

          <div className="footer-actions">
            <button type="submit" className="submit-button1">
              Enregistrer les modifications
            </button>
            <button type="button" className="btn-cancel" onClick={() => navigate("/clients")}>
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}