import React, { useState, useEffect } from "react";
import "./Add_clients.css";
import { API_BACK_URL } from "../config/config";
import { useNavigate } from "react-router-dom";

// Liste statique pour l'affichage; les labels seront complétés par l'API si besoin
const ALL_BUTTONS = [
  { action_key: "historique", label: "Historique des évènements" },
  { action_key: "sav", label: "Évènement SAV" },
  { action_key: "negoce", label: "Évènement Négoce" },
  { action_key: "demande-prix", label: "Entrée de demande de prix" },
  { action_key: "commande", label: "Entrée de commande" },
  { action_key: "info", label: "Demande d'information" },
];

export default function AddClient() {
  const [form, setForm] = useState({
    site_number: "", email: "", dolibarr_url: "",
    token_url: "", username: "", password: "",
    dolibarr_api_key: "", domain: "", logo: "",
  });

  // selectedButtons: array d'objets { action_key, label, event_type_id }
  const [selectedButtons, setSelectedButtons] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [message, setMessage] = useState("");
  const [eventTypesByButton, setEventTypesByButton] = useState({}); // chargé depuis backend

  useEffect(() => {
    // Charger les types d'événements disponibles pour chaque bouton
    fetch(`${API_BACK_URL}/getButtonEventTypes.php`)
      .then(res => res.json())
      .then(data => {
        setEventTypesByButton(data || {});
      })
      .catch(() => setEventTypesByButton({}));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const toggleButton = (btn) => {
    setSelectedButtons((prev) => {
      const exists = prev.find((b) => b.action_key === btn.action_key);
      if (exists) {
        return prev.filter((b) => b.action_key !== btn.action_key);
      } else {
        // si on active, pré-remplir event_type_id avec le premier type disponible (si présent)
        const types = eventTypesByButton[btn.action_key]?.event_types;
        const defaultEventTypeId = types && types.length ? types[0].id : null;
        return [...prev, { action_key: btn.action_key, label: btn.label, event_type_id: defaultEventTypeId }];
      }
    });
  };

  const setButtonEventType = (action_key, event_type_id) => {
    setSelectedButtons((prev) =>
      prev.map((b) =>
        b.action_key === action_key ? { ...b, event_type_id: event_type_id ? parseInt(event_type_id, 10) : null } : b
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedButtons.length === 0) {
      setMessage("Veuillez sélectionner au moins un bouton.");
      return;
    }

    // Vérifier que chaque bouton a un event_type_id choisi
    for (const b of selectedButtons) {
      if (!b.event_type_id) {
        setMessage("Veuillez choisir un type d'événement pour chaque bouton sélectionné.");
        return;
      }
    }

    const payload = { ...form, buttons: selectedButtons.map(b => ({ action_key: b.action_key, event_type_id: b.event_type_id })) };

    try {
      const res = await fetch(`${API_BACK_URL}/createClient.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setMessage("✅ Client ajouté avec succès !");
        setForm({
          site_number: "", email: "", dolibarr_url: "",
          token_url: "", username: "", password: "",
          dolibarr_api_key: "", domain: "", logo: "",
        });
        setSelectedButtons([]);
      } else {
        setMessage("❌ Erreur : " + (data.error || data.message || "Inconnue"));
      }
    } catch {
      setMessage("❌ Impossible de contacter le serveur.");
    }
  };
  const navigate = useNavigate();
  return (
    <div className="client-wrapper">
      <div className="client-card">
        <div className="header">
          <h2>Ajouter un client</h2>
          <p>Remplissez les informations ci-dessous</p>
        </div>
        <button
          type="button"
          className="back-button"
          onClick={() => navigate(-1)}
        >
          ← Retour
        </button>

        <form onSubmit={handleSubmit}>
          <div className="input-grid">
            {[
              { name: "site_number", label: "N° de site", type: "text" },
              { name: "email", label: "Email", type: "email" },
              { name: "dolibarr_url", label: "URL Dolibarr", type: "url" },
              { name: "token_url", label: "URL Token", type: "url" },
              { name: "username", label: "Utilisateur", type: "text" },
              { name: "password", label: "Mot de passe", type: "password" },
              { name: "dolibarr_api_key", label: "Clé API Dolibarr", type: "text" },
              { name: "domain", label: "Domaine", type: "text" },
              { name: "logo", label: "URL Logo", type: "url" },
            ].map(({ name, label, type }) => (
              <div className="input-group" key={name}>
                <label>{label}</label>
                <input
                  type={type}
                  name={name}
                  value={form[name]}
                  onChange={handleChange}
                  required
                />
              </div>
            ))}

            <div className="input-group full-width">
              <label>Boutons activés</label>
              <div className="buttons-field" onClick={() => setShowPopup(true)}>
                {selectedButtons.length === 0
                  ? <span className="placeholder">Cliquez pour sélectionner les boutons…</span>
                  : selectedButtons.map((b) => (
                    <span key={b.action_key} className="btn-tag">{b.label}</span>
                  ))
                }
              </div>
            </div>
          </div>

          {message && <p style={{ marginTop: '15px', color: message.includes('✅') ? '#2ecc71' : '#e74c3c' }}>{message}</p>}

          <button type="submit" className="submit-button">Ajouter le client</button>
        </form>
      </div>

      {showPopup && (
        <div className="popup-overlay" onClick={() => setShowPopup(false)}>
          <div className="popup-box" onClick={(e) => e.stopPropagation()}>
            <h3>Sélectionner les boutons</h3>
            <div className="popup-buttons-list">
              {ALL_BUTTONS.map((btn) => {
                const checked = !!selectedButtons.find((b) => b.action_key === btn.action_key);
                const types = eventTypesByButton[btn.action_key]?.event_types || [];
                const selected = selectedButtons.find((b) => b.action_key === btn.action_key);

                return (
                  <div key={btn.action_key} className={`popup-btn-item-wrapper ${checked ? "checked" : ""}`}>
                    <label className={`popup-btn-item ${checked ? "checked" : ""}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleButton(btn)}
                      />
                      {btn.label}
                    </label>

                    {checked && (
                      <div className="event-type-select">
                        <select
                          value={selected?.event_type_id || ""}
                          onChange={(e) => setButtonEventType(btn.action_key, e.target.value)}
                        >
                          <option value="">-- Type d’événement --</option>
                          {types.map((et) => (
                            <option key={et.id} value={et.id}>{et.label}</option>
                          ))}
                        </select>
                        {types.length === 0 && (
                          <small style={{ color: '#999' }}>Aucun type disponible pour ce bouton</small>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="popup-confirm" onClick={() => setShowPopup(false)}>
                Confirmer ({selectedButtons.length} sélectionnés)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
