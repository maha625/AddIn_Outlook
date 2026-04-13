import { useState, useEffect } from "react";
import axios from "axios";
import "./ClientList.css";
import { API_BACK_URL } from "../config/config";
import { useNavigate } from "react-router-dom"; // 1. Import nécessaire pour navigate

function ClientList() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate(); // 2. Initialisation du hook

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await axios.get(`${API_BACK_URL}/getClients.php`);
        setClients(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      } catch (error) {
        console.error("Erreur API:", error);
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  // 3. Définition de handleDelete en dehors du flux de rendu principal
  const handleDelete = async (id) => {
    if (window.confirm("Voulez-vous vraiment supprimer ce client ?")) {
      try {
        const res = await axios.post(`${API_BACK_URL}/deleteClient.php`, { id });
        if (res.data.success) {
          setClients(clients.filter((c) => c.id !== id));
        } else {
          alert("Erreur: " + (res.data.error || "Impossible de supprimer"));
        }
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        alert("Erreur réseau lors de la suppression");
      }
    }
  };

  const filtered = clients.filter(
    (c) =>
      c.domain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.site_number?.toString().includes(searchTerm)
  );

  if (loading) return <div className="loader">Chargement des données...</div>;

  return (
    <div className="list-container">
      <header className="list-header-admin">
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
              <th>Actions</th>
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
                <td>
                  <span className="badge-site">{client.site_number}</span>
                </td>
                <td className="text-small">{client.email}</td>
                <td className="text-bold">{client.username}</td>
                <td className="urls-cell">
                  <div>
                    <small>App:</small>{" "}
                    <a
                      href={client.dolibarr_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Lien Dolibarr
                    </a>
                  </div>
                  <div>
                    <small>Token:</small>{" "}
                    <span className="url-text">{client.token_url}</span>
                  </div>
                </td>
                <td>
                  <code className="api-key-display">
                    {client.dolibarr_api_key
                      ? `${client.dolibarr_api_key.substring(0, 10)}...`
                      : "---"}
                  </code>
                </td>
                <td className="text-muted">
                  {new Date(client.created_at).toLocaleDateString()}
                </td>
                <td className="actions-cell">
                  <button
                    onClick={() => navigate(`/edit-client/${client.id}`)}
                    className="btn-action btn-edit"
                    title="Modifier"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button 
                    onClick={() => handleDelete(client.id)} 
                    className="btn-action btn-delete" 
                    title="Supprimer"
                  >
                    <i className="fas fa-trash-alt"></i> {/* Icône FontAwesome */}
                  </button>
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