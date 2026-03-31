import { useState, useEffect } from "react";
import axios from "axios";
import "./Add_clients.css";
import { API_BACK_URL } from "../config/config";

function AddClient() {
  const [formData, setFormData] = useState({
    site_number: "",
    email: "",
    dolibarr_url: "",
    token_url: "",
    username: "",
    password: "",
    dolibarr_api_key: "",
    domain: "",
    logo: ""
  });

  // Extraction automatique du domaine
  useEffect(() => {
    if (formData.email.includes("@")) {
      const domain = formData.email.split("@")[1];
      setFormData((prev) => ({ ...prev, domain }));
    }
  }, [formData.email]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Axios gère automatiquement le JSON.stringify si on lui passe l'objet directement
      const res = await axios.post(
        `${API_BACK_URL}/createClient.php`,
        formData, 
        { headers: { "Content-Type": "application/json" } }
      );

      if (res.data.success) {
        alert("Client ajouté avec succès ✅");
        setFormData({
          site_number: "", email: "", dolibarr_url: "", token_url: "",
          username: "", password: "", dolibarr_api_key: "", domain: "", logo: ""
        });
      } else {
        alert(`Erreur: ${res.data.message || "Problème lors de l'insertion"}`);
      }
    } catch (error) {
      console.error("Erreur API:", error.response?.data || error.message);
      alert("Erreur lors de l'ajout ❌");
    }
  };

  return (
    <div className="client-wrapper">
      <div className="client-card">
        <div className="header">
          <h2>Ajouter un Client</h2>
          <p>Remplissez les informations pour configurer le nouveau site.</p>
        </div>

        <form onSubmit={handleSubmit} className="client-form">
          <div className="input-grid">
            {/* Section Informations de base */}
            <div className="input-group">
              <label>Numéro de Site</label>
              <input name="site_number" placeholder="Ex: 101" value={formData.site_number} onChange={handleChange} required />
            </div>

            <div className="input-group">
              <label>Email</label>
              <input name="email" type="email" placeholder="client@domaine.com" value={formData.email} onChange={handleChange} required />
            </div>

            {/* Section URLs */}
            <div className="input-group">
              <label>Dolibarr URL</label>
              <input name="dolibarr_url" type="url" placeholder="http://..." value={formData.dolibarr_url} onChange={handleChange} />
            </div>

            <div className="input-group">
              <label>Token URL</label>
              <input name="token_url" type="url" placeholder="http://..." value={formData.token_url} onChange={handleChange} />
            </div>

            {/* Section Authentification */}
            <div className="input-group">
              <label>Utilisateur</label>
              <input name="username" placeholder="Admin" value={formData.username} onChange={handleChange} />
            </div>

            <div className="input-group">
              <label>Mot de passe</label>
              <input type="password" name="password" placeholder="••••••••" value={formData.password} onChange={handleChange} />
            </div>

            {/* Section Autres */}
            <div className="input-group">
              <label>Clé API Dolibarr</label>
              <input name="dolibarr_api_key" placeholder="API Key" value={formData.dolibarr_api_key} onChange={handleChange} />
            </div>

            <div className="input-group">
              <label>Domaine</label>
              <input name="domain" placeholder="domaine.com" value={formData.domain} onChange={handleChange} readOnly />
            </div>

            <div className="input-group full-width">
              <label>URL du Logo</label>
              <input name="logo" placeholder="https://image.com/logo.png" value={formData.logo} onChange={handleChange} />
            </div>
          </div>

          <button type="submit" className="submit-button">Enregistrer le Client</button>
        </form>
      </div>
    </div>
  );
}

export default AddClient;