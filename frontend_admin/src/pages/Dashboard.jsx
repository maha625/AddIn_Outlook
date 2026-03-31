import React from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Administration Add-in Outlook</h1>
        <p>Bienvenue dans votre interface de gestion des clients</p>
      </header>

      <div className="dashboard-grid">
        {/* Carte Ajouter un Client */}
        <div className="dash-card" onClick={() => navigate("/add-client")}>
          <div className="icon-box blue">
            <i className="fas fa-user-plus"></i>
          </div>
          <h3>Ajouter un Client</h3>
          <p>Enregistrer une nouvelle entreprise et configurer ses accès Dolibarr.</p>
          <button className="dash-btn">Y aller</button>
        </div>

        {/* Carte Liste des Clients */}
        <div className="dash-card" onClick={() => navigate("/clients")}>
          <div className="icon-box green">
            <i className="fas fa-users"></i>
          </div>
          <h3>Afficher les Clients</h3>
          <p>Consulter, vérifier les domaines et gérer les clients existants.</p>
          <button className="dash-btn">Consulter</button>
        </div>
        
        {/* Optionnel : Statistiques ou Logs */}
        <div className="dash-card disabled">
          <div className="icon-box orange">
            <i className="fas fa-chart-line"></i>
          </div>
          <h3>Statistiques</h3>
          <p>Bientôt : Visualisez l'activité des connexions par domaine.</p>
          <span className="badge">Bientôt</span>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;