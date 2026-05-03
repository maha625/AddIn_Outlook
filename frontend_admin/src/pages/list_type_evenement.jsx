import React, { useState, useEffect } from 'react';
import { API_BACK_URL } from "../config/config";
import EditEventPage from './EditEventPage'; 
import './list_type_evenement.css';

const EventSelector = () => {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [eventTypes, setEventTypes] = useState([]);
    const [editingEvent, setEditingEvent] = useState(null);

    // Charger les utilisateurs au montage
    useEffect(() => {
        fetch(`${API_BACK_URL}/list_evenemnt_user.php?action=get_users`)
            .then(res => res.json())
            .then(data => setUsers(data))
            .catch(err => console.error("Erreur chargement utilisateurs:", err));
    }, []);

    // Charger les types d'événements quand l'utilisateur change
    useEffect(() => {
        if (selectedUser) {
            fetchTypes();
        } else {
            setEventTypes([]);
        }
    }, [selectedUser]);

    const fetchTypes = () => {
        fetch(`${API_BACK_URL}/list_evenemnt_user.php?action=list_types&user_id=${selectedUser}`)
            .then(res => res.json())
            .then(data => setEventTypes(data))
            .catch(err => console.error("Erreur chargement types:", err));
    };

    const handleDelete = async (code) => {
        if (window.confirm(`Voulez-vous vraiment supprimer le type ${code} ?`)) {
            try {
                const response = await fetch(`${API_BACK_URL}/delete_type_evenent.php?action=delete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });

                const result = await response.json();

                if (result.success) {
                    // Rafraîchissement après succès
                    fetchTypes(); 
                } else {
                    alert("Erreur lors de la suppression : " + result.error);
                }
            } catch (err) {
                console.error("Erreur réseau suppression:", err);
                alert("Impossible de contacter le serveur.");
            }
        }
    };

    return (
        <div className="event-list-container1">
            <div className="event-header-admin">
                <div>
                    <h2>Gestion des Événements</h2>
                    <p>Sélectionnez un utilisateur pour gérer ses types d'événements</p>
                </div>
                
                <select 
                    onChange={(e) => setSelectedUser(e.target.value)} 
                    value={selectedUser}
                    className="admin-select"
                >
                    <option value="">-- Choisir un utilisateur --</option>
                    {users.map(u => (
                        <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                </select>
            </div>

            <div className="event-table-wrapper">
                <table className="event-type-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Libellé</th>
                            <th>Couleur</th>
                            <th>Position</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {eventTypes.length > 0 ? (
                            eventTypes.map((type) => (
                                <tr key={type.code}>
                                    <td style={{ fontWeight: 'bold' }}>{type.code}</td>
                                    <td>{type.libelle}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span 
                                                className="color-preview-circle" 
                                                style={{ backgroundColor: type.color || '#ccc' }}
                                            ></span>
                                            {type.color}
                                        </div>
                                    </td>
                                    <td >
                                        {type.position || 0}
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button 
                                                className="btn-edit" 
                                                onClick={() => setEditingEvent(type)}
                                                title="Modifier"
                                            >
                                                <i className="fas fa-pencil-alt"></i>
                                            </button>
                                            <button 
                                                className="btn-delete" 
                                                onClick={() => handleDelete(type.code)}
                                                title="Supprimer"
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                                    {selectedUser ? "Aucun événement trouvé." : "Veuillez sélectionner un utilisateur."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Fenêtre modale d'édition */}
            {editingEvent && (
                <EditEventPage 
                    event={editingEvent} 
                    onCancel={() => setEditingEvent(null)} 
                    onSave={() => { 
                        setEditingEvent(null); 
                        fetchTypes(); 
                    }} 
                />
            )}
        </div>
    );
};

export default EventSelector;