import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BACK_URL } from "../config/config";
import "./AddButtonsToExisting.css";

// Liste des icônes disponibles
const ICON_OPTIONS = [
  { label: "Étiquette", value: "fas fa-tag" },
  { label: "Lien", value: "fas fa-link" },
  { label: "Étoile", value: "fas fa-star" },
  { label: "Cœur", value: "fas fa-heart" },
  { label: "Check", value: "fas fa-check" },
  { label: "Enveloppe", value: "fas fa-envelope" },
  { label: "Info", value: "fas fa-info-circle" },
  { label: "Alerte", value: "fas fa-exclamation-triangle" },
];

export default function AddButtonsToExisting() {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [buttons, setButtons] = useState([
    { label: "", event_name: "", bg_color: "#2563eb", text_color: "#ffffff", icon: "fas fa-tag" }
  ]);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get(`${API_BACK_URL}/getClients.php`)
      .then(res => setClients(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error("Erreur chargement clients", err));
  }, []);

  // Fonction de mise à jour unique (Même logique que précédemment)
  const handleButtonChange = (index, field, value) => {
    const updated = [...buttons];
    updated[index] = { ...updated[index], [field]: value };
    setButtons(updated);
  };

  const addButtonRow = () => setButtons([...buttons, { label: "", event_name: "", bg_color: "#2563eb", text_color: "#ffffff", icon: "fas fa-tag" }]);

  const removeButtonRow = (index) => {
    if (buttons.length > 1) setButtons(buttons.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClientId) {
        setMessage({ type: "error", text: "❌ Veuillez sélectionner un client." });
        return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_BACK_URL}/addButtons.php`, {
        client_id: selectedClientId,
        buttons: buttons
      });
      if (res.data.success) {
        setMessage({ type: "success", text: "✅ Configuration enregistrée !" });
        setButtons([{ label: "", event_name: "", bg_color: "#2563eb", text_color: "#ffffff", icon: "fas fa-tag" }]);
      }
    } catch (err) {
      setMessage({ type: "error", text: "❌ Erreur de connexion au serveur." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-buttons-wrapper">
      <div className="add-buttons-card">
        <h2>Gestion des Boutons Personnalisés</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <label>Choisir le Client</label>
            <select 
              className="client-select" 
              value={selectedClientId} 
              onChange={(e) => setSelectedClientId(e.target.value)} 
              required
            >
              <option value="">-- Sélectionner un client --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.domain} (Site: {c.site_number})</option>
              ))}
            </select>
          </div>

          <div className="buttons-config-container">
            {buttons.map((btn, index) => (
              <div key={index} className="btn-edit-card">
                <div className="inputs-main">
                  <input 
                    placeholder="Libellé" 
                    value={btn.label} 
                    onChange={e => handleButtonChange(index, "label", e.target.value)} 
                    required 
                  />
                  <input 
                    placeholder="Événement" 
                    value={btn.event_name} 
                    onChange={e => handleButtonChange(index, "event_name", e.target.value)} 
                    required 
                  />
                  
                  {/* REMPLACEMENT : Input texte par Select d'icônes */}
                  <select 
                    className="icon-select"
                    value={btn.icon} 
                    onChange={e => handleButtonChange(index, "icon", e.target.value)}
                  >
                    {ICON_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="color-controls">
                  <div className="color-field">
                    <label>Fond</label>
                    <input type="color" value={btn.bg_color} onChange={e => handleButtonChange(index, "bg_color", e.target.value)} />
                  </div>
                  <div className="color-field">
                    <label>Texte</label>
                    <input type="color" value={btn.text_color} onChange={e => handleButtonChange(index, "text_color", e.target.value)} />
                  </div>
                  
                  <div className="preview-zone">
                    <button 
                      type="button" 
                      className="real-preview-btn"
                      style={{ 
                        backgroundColor: btn.bg_color, 
                        color: btn.text_color,
                        border: `1px solid ${btn.bg_color === '#ffffff' ? '#ddd' : btn.bg_color}` 
                      }}
                    >
                      <i className={btn.icon}></i> {btn.label || "Aperçu"}
                    </button>
                  </div>

                  <button type="button" className="btn-del" onClick={() => removeButtonRow(index)}>&times;</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={addButtonRow} className="btn-add-row">+ Ajouter un bouton</button>
          </div>

          {message.text && <div className={`alert ${message.type}`}>{message.text}</div>}
          <button type="submit" className="btn-save-all" disabled={loading}>
            {loading ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </form>
      </div>
    </div>
  );
}