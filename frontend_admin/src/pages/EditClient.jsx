import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BACK_URL, ICONS_BASE_URL } from "../config/config";
import "./EditClient.css";

export default function EditClient() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    site_number: "",
    email: "",
    dolibarr_url: "",
    username: "",
    dolibarr_api_key: "",
    domain: "",
    logo: "",
    palette_id: "default",
  });

  const [buttons,      setButtons]      = useState([]);
  const [eventTypes,   setEventTypes]   = useState([]);
  const [iconOptions,  setIconOptions]  = useState([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [iconsLoading, setIconsLoading] = useState(true);
  const [loading,      setLoading]      = useState(true);
  const [message,      setMessage]      = useState("");
  const [palettes,     setPalettes]     = useState([]);
  const [palette,      setPalette]      = useState(null);

  // ── 1. Chargement des palettes ───────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BACK_URL}/getPalettes.php`)
      .then(r => r.json())
      .then(d => setPalettes(d.palettes || []));
  }, []);

  // ── 2. Mettre à jour la palette courante quand form.palette_id change ────
  useEffect(() => {
    if (palettes.length && form.palette_id) {
      setPalette(palettes.find(p => p.id === form.palette_id) || palettes[0]);
    }
  }, [form.palette_id, palettes]);

  // ── 3. Chargement dynamique des icônes ───────────────────────────────────
  useEffect(() => {
    const fetchIcons = async () => {
      setIconsLoading(true);
      try {
        const res = await fetch(`${ICONS_BASE_URL}?file=icons.json`);
        const data = await res.json();
        setIconOptions(data);
      } catch (err) {
        console.error("Erreur chargement icônes :", err);
        setIconOptions([]);
      } finally {
        setIconsLoading(false);
      }
    };
    fetchIcons();
  }, []);

  // ── 4. Chargement des détails du client et de ses boutons ────────────────
  useEffect(() => {
    const fetchClientDetails = async () => {
      try {
        const res = await axios.get(`${API_BACK_URL}/getClientDetails.php?id=${id}`);
        if (res.data.success) {
          const c = res.data.client;
          setForm({
            site_number:      c.site_number      || "",
            email:            c.email            || "",
            dolibarr_url:     c.dolibarr_url     || "",
            username:         c.username         || "",
            dolibarr_api_key: c.dolibarr_api_key || "",
            domain:           c.domain           || "",
            logo:             c.logo             || "",
            palette_id:       c.palette_id       || "default",
          });
          setButtons(
            (res.data.buttons || []).map(b => ({
              ...b,
              dolibarr_type_code:  b.dolibarr_type_code ?? "",
              allow_linked_events: b.allow_linked_events == 1,
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

  // ── 5. Chargement des types d'événements Dolibarr ────────────────────────
  useEffect(() => {
    const fetchTypes = async () => {
      setTypesLoading(true);
      try {
        const res = await axios.get(`${API_BACK_URL}/GetDolibarrEventTypes.php?client_id=${id}`);
        if (res.data.success) setEventTypes(res.data.types || []);
      } catch (err) {
        console.error("Erreur récupération types:", err);
      } finally {
        setTypesLoading(false);
      }
    };
    fetchTypes();
  }, [id]);

  // ── 6. Auto-remplissage du domaine via l'email ───────────────────────────
  useEffect(() => {
    if (form.email?.includes("@")) {
      const detectedDomain = form.email.split("@")[1];
      setForm(prev => ({ ...prev, domain: detectedDomain }));
    }
  }, [form.email]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const buildIconUrl = (file) => `${ICONS_BASE_URL}?file=${file}`;

  const getIconFilter = (textColor = "#ffffff") => {
    const clean = textColor.replace("#", "");
    if (clean.length < 6) return "brightness(0) invert(1)";
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5
      ? "brightness(0)"
      : "brightness(0) invert(1)";
  };

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
      {
        label:               "",
        bg_color:            palette?.btn_bg   || "#2563eb",
        text_color:          palette?.btn_text || "#ffffff",
        icon:                iconOptions[0]?.file || "tag.svg",
        dolibarr_type_code:  "",
        allow_linked_events: false,
      },
    ]);

  const removeButton = (index) => {
    if (buttons.length > 1)
      setButtons(prev => prev.filter((_, i) => i !== index));
  };

  // ── Soumission ───────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const cleanButtons = buttons.map(b => ({
        label:               b.label || "Sans nom",
        bg_color:            b.bg_color   || "#2563eb",
        text_color:          b.text_color || "#ffffff",
        icon:                b.icon || "tag.svg",
        dolibarr_type_code:  b.dolibarr_type_code || null,
        allow_linked_events: b.allow_linked_events ? 1 : 0,
      }));

      const payload = { id, ...form, buttons: cleanButtons };
      const res = await axios.post(`${API_BACK_URL}/updateClient.php`, payload);

      if (res.data.success) {
        setMessage("✅ Configuration mise à jour avec succès !");
        setTimeout(() => navigate("/clients"), 1500);
      } else {
        setMessage("❌ Erreur : " + res.data.error);
      }
    } catch (err) {
      setMessage("❌ Erreur réseau lors de la mise à jour");
    }
  };

  if (loading) return <div className="loader">Chargement...</div>;

  return (
    <div className="client-wrapper">
      <div className="client-card">
        <div className="header">
          <h2>Modifier le Client <span style={{ color: "#2563eb" }}>#{form.site_number}</span></h2>
          <p>Mettez à jour les accès API et la configuration des boutons</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-grid">
            {[
              { name: "site_number",      label: "N° de site",                  type: "text"  },
              { name: "email",            label: "Email Contact",                type: "email" },
              { name: "dolibarr_url",     label: "URL Dolibarr",                 type: "url"   },
              { name: "username",         label: "Nom d'utilisateur",            type: "text"  },
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

          {/* ── Palette de couleurs ── */}
          <div className="input-group" style={{ marginTop: "16px" }}>
            <label>Palette de couleurs</label>
            <select name="palette_id" value={form.palette_id} onChange={handleChange}>
              {palettes.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          <hr className="divider" />

          <div className="buttons-config-section">
            <div className="section-header">
              <h3>Boutons de l'Add-in Outlook</h3>
              <button type="button" className="add-btn-row" onClick={addButton}>
                + Ajouter un bouton
              </button>
            </div>

            {buttons.map((btn, index) => (
              <div key={index} className="button-row-container">
                <div className="button-row">

                  {/* Libellé */}
                  <div className="btn-input">
                    <label>Libellé</label>
                    <input
                      type="text" value={btn.label} required
                      onChange={e => handleButtonChange(index, "label", e.target.value)}
                      placeholder="Ex: Appeler"
                    />
                  </div>

                  {/* Icône */}
                  <div className="btn-input">
                    <label>Icône</label>
                    {iconsLoading ? (
                      <select className="icon-select" disabled>
                        <option>Chargement…</option>
                      </select>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {btn.icon && (
                          <img
                            src={buildIconUrl(btn.icon)}
                            alt=""
                            style={{ width: "22px", height: "22px", opacity: 0.75, flexShrink: 0 }}
                          />
                        )}
                        <select
                          value={btn.icon}
                          className="icon-select"
                          onChange={e => handleButtonChange(index, "icon", e.target.value)}
                        >
                          {iconOptions.map(opt => (
                            <option key={opt.file} value={opt.file}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Type d'événement Dolibarr */}
                  <div className="btn-input">
                    <label>Type d'événement Dolibarr</label>
                    <select
                      value={btn.dolibarr_type_code ?? ""}
                      className="icon-select"
                      disabled={typesLoading}
                      onChange={e => handleButtonChange(index, "dolibarr_type_code", e.target.value)}
                    >
                      <option value="">
                        {typesLoading ? "Chargement..." : "-- Sélectionner un type --"}
                      </option>
                      {eventTypes.map((t) => (
                        <option key={t.code} value={t.code}>
                          {t.label} ({t.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Événements liés */}
                  <div className="btn-input">
                    <label>Événements liés?</label>
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={btn.allow_linked_events}
                        onChange={e => handleButtonChange(index, "allow_linked_events", e.target.checked)}
                      />
                      <span className="checkbox-text">Autoriser</span>
                    </label>
                  </div>

                  <br />

                  {/* Couleurs */}
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

                  {/* Aperçu */}
                  <div className="btn-preview-mini">
                    <label>Aperçu</label>
                    <div
                      className="preview-box"
                      style={{ backgroundColor: btn.bg_color, color: btn.text_color }}
                    >
                      {btn.icon && (
                        <img
                          src={buildIconUrl(btn.icon)}
                          alt=""
                          style={{
                            width: "14px",
                            height: "14px",
                            marginRight: btn.label ? "6px" : "0",
                            flexShrink: 0,
                            filter: getIconFilter(btn.text_color),
                          }}
                        />
                      )}
                      <span>{btn.label || "Bouton"}</span>
                    </div>
                  </div>

                  {/* Suppression */}
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