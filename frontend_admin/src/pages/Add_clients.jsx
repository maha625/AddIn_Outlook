import React, { useState, useEffect } from "react";
import "./Add_clients.css";
import { API_BACK_URL } from "../config/config";
import { useNavigate } from "react-router-dom";

export default function AddClient() {
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

  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Auto-complétion du domaine basée sur l'email
  useEffect(() => {
    if (form.email && form.email.includes("@")) {
      const extractedDomain = form.email.split("@")[1];
      setForm((prev) => ({
        ...prev,
        domain: extractedDomain,
      }));
    }
  }, [form.email]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Le payload contient uniquement les informations du formulaire client
    const payload = { ...form };

    try {
      const res = await fetch(`${API_BACK_URL}/createClient.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setMessage("✅ Client configuré avec succès !");
        setForm({
          site_number: "",
          email: "",
          dolibarr_url: "",
          username: "",
          dolibarr_api_key: "",
          domain: "",
          logo: "",
        });

        setTimeout(() => navigate("/clients"), 2000);
      } else {
        setMessage("❌ Erreur : " + (data.error || "Inconnue") + (data.details ? ` — ${data.details}` : ""));
      }
    } catch {
      setMessage("❌ Impossible de contacter le serveur.");
    }
  };
  const [palettes, setPalettes] = useState([]);

  useEffect(() => {
    fetch(`${API_BACK_URL}/getPalettes.php`)
      .then(r => r.json())
      .then(d => setPalettes(d.palettes || []));
  }, []);

  return (
    <div className="client-wrapper">
      <div className="client-card">
        <div className="header">
          <h2>Ajouter un client</h2>
        </div>


        <form onSubmit={handleSubmit}>
          {/* Section : Informations Client */}
          <div className="input-grid">
            {[
              { name: "site_number", label: "N° de site", type: "text" },
              { name: "email", label: "Email Contact", type: "email" },
              { name: "dolibarr_url", label: "URL Dolibarr", type: "url" },
              { name: "username", label: "Nom d'utilisateur", type: "text" },
              { name: "dolibarr_api_key", label: "Clé API Dolibarr", type: "text" },
              { name: "domain", label: "Domaine (ex: @entreprise.com)", type: "text" },
              { name: "logo", label: "URL Logo Client", type: "url" },
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
          </div>
          <div className="input-group">
            <label>Palette de couleurs</label>
            <select name="palette_id" value={form.palette_id} onChange={handleChange}>
              {palettes.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          {message && (
            <p className={`message ${message.includes("✅") ? "success" : "error"}`}>
              {message}
            </p>
          )}

          <button type="submit" className="submit-button">
            Enregistrer le client
          </button>
        </form>
      </div>
    </div>
  );
}