import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ClientList.css";

function ClientList() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await axios.get("http://localhost/backend/authentification/getClients.php");
        setClients(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      } catch (error) {
        console.error("Erreur API:", error);
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  const filtered = clients.filter(c => 
    c.domain?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.site_number?.toString().includes(searchTerm)
  );

  if (loading) return <div className="loader">Chargement des données...</div>;

  return (
    <div className="list-container">
      <header className="list-header-admin">
        <button className="back-btn" onClick={() => navigate("/")}>← Dashboard</button>
        <div className="title-section">
          <h2>Base de Données Clients</h2>
          <p>Gestion complète des configurations d'intégration</p>
        </div>
      </header>

      <div className="filter-bar">
        <input 
          type="text" 
          placeholder="Rechercher par domaine ou N°..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="table-wrapper">
        <table className="full-client-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Client / Logo</th>
              <th>Site N°</th>
              <th>Contact Email</th>
              <th>Auth (User)</th>
              <th>Configuration URLs</th>
              <th>Dolibarr API Key</th>
              <th>Date d'ajout</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((client) => (
              <tr key={client.id}>
                <td className="text-muted">{client.id}</td>
                <td className="col-client-info">
                  <img src={client.logo} alt="logo" className="mini-logo" />
                  <span className="domain-name">{client.domain}</span>
                </td>
                <td><span className="badge-site">{client.site_number}</span></td>
                <td className="text-small">{client.email}</td>
                <td className="text-bold">{client.username}</td>
                <td className="urls-cell">
                  <div><small>App:</small> <a href={client.dolibarr_url} target="_blank">Lien Dolibarr</a></div>
                  <div><small>Token:</small> <span className="url-text">{client.token_url}</span></div>
                </td>
                <td>
                  <code className="api-key-display">
                    {client.dolibarr_api_key ? `${client.dolibarr_api_key.substring(0, 10)}...` : "---"}
                  </code>
                </td>
                <td className="text-muted">
                  {new Date(client.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ClientList;