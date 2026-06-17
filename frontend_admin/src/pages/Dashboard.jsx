import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BACK_URL } from "../config/config";
import "./Dashboard.css";

// Import d'icônes si tu en as (ex: lucide-react ou font-awesome), 
// sinon on utilise des emojis pour la démo.
export default function Dashboard() {

  const [stats, setStats] = useState({
  total: 0,
  recent: [],
  recentAdded: "Aucun",
  apiStatus: false
});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
  const fetchDashboardData = async () => {
    try {
      const res = await axios.get(`${API_BACK_URL}/getClients.php`);

      const data = Array.isArray(res.data) ? res.data : [];

      setStats({
        total: data.length,
        recent: data.slice(0, 5),
        recentAdded: data.length > 0 ? data[0].domain : "Aucun",
        apiStatus: true
      });

    } catch (error) {
      console.error("Erreur Dashboard:", error);

      setStats(prev => ({
        ...prev,
        apiStatus: false
      }));
    } finally {
      setLoading(false);
    }
  };

  fetchDashboardData();
}, []);

  if (loading) return <div className="loader">Initialisation du panel...</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Tableau de Bord</h1>
        <p>Bienvenue, voici l'état de vos intégrations Dolibarr.</p>
      </div>

      {/* Section des KPIs */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <span className="stat-label">Total Clients</span>
            <span className="stat-value">{stats.total}</span>
          </div>
        </div>

        {/* ── CARD VERTE CORRIGÉE SANS SANS CHANGEMENT DE CLASSE ── */}
        <div className="stat-card green">
          <div className="stat-icon">✨</div>
          <div className="stat-info">
            <span className="stat-label">Dernier Client</span>
            <span className="stat-value">{stats.recentAdded}</span>
          </div>
        </div>

        <div className={`stat-card ${stats.apiStatus ? "green" : "red"}`}>
  <div className="stat-icon">
    {stats.apiStatus ? "🟢" : "🔴"}
  </div>

  <div className="stat-info">
    <span className="stat-label">Status API</span>

    <span className="stat-value">
      {stats.apiStatus ? "Opérationnelle" : "Indisponible"}
    </span>
  </div>
</div>
      </div>

      <div className="dashboard-content">
        {/* Liste des clients récents */}
        <div className="recent-section">
          <div className="section-header">
            <h3>Ajouts récents</h3>
            <button onClick={() => navigate("/clients")} className="view-all-btn">
              Voir tout
            </button>
          </div>
          <div className="mini-table-wrapper">
            <table className="mini-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>N° Site</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((client) => (
                  <tr key={client.id}>
                    <td className="client-cell">
                      <img src={client.logo} alt="" className="tiny-logo" />
                      {client.domain}
                    </td>
                    <td>{client.site_number}</td>
                    <td>{new Date(client.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions Rapides */}
        <div className="actions-section">
          <h3>Actions rapides</h3>
          <div className="action-buttons">
            <button className="action-btn primary" onClick={() => navigate("/add-client")}>
              <span>+</span> Nouveau Client
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}