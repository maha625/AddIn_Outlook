import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BACK_URL } from "../config/config";
import './Add_type_evenement.css';
const AddEventTypePage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [formData, setFormData] = useState({
        code: '',
        libelle: '',
        color: '#3498db',
        position: 50,
        fk_user: '' 
    });

    useEffect(() => {
        fetch(`${API_BACK_URL}/getClients.php`)
            .then(res => res.json())
            .then(data => setUsers(data))
            .catch(err => console.error("Erreur chargement utilisateurs :", err));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch(`${API_BACK_URL}/Add_type_evenement.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                alert("Le type d'événement a bien été intégré au dictionnaire Dolibarr.");
                navigate('/list-type-evenement');
            } else {
                alert("Erreur Dolibarr : " + result.error);
            }
        } catch (error) {
            // Affichez l'erreur complète ici
            console.error("ERREUR DETAILLEE:", error); 
            alert("Erreur de communication : " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="list-container1">
            <h2>Nouveau Type d'Événement (Dictionnaire)</h2>
            <form onSubmit={handleSubmit} className="event-form">
                <div className="form-group">
                    <label>Utilisateur responsable</label>
                    <select 
                        className="input-field"
                        value={formData.fk_user}
                        onChange={(e) => setFormData({...formData, fk_user: e.target.value})}
                        required
                    >
                        <option value="">-- Sélectionner l'utilisateur --</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.username}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Code (Unique, ex: RDV_TECH)</label>
                    <input 
                        type="text" 
                        className="input-field"
                        value={formData.code}
                        onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Libellé</label>
                    <input 
                        type="text" 
                        className="input-field"
                        value={formData.libelle}
                        onChange={(e) => setFormData({...formData, libelle: e.target.value})}
                        required
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Couleur</label>
                        <input 
                            type="color" 
                            className="input-field"
                            value={formData.color}
                            onChange={(e) => setFormData({...formData, color: e.target.value})}
                        />
                    </div>
                    <div className="form-group">
                        <label>Ordre d'affichage</label>
                        <input 
                            type="number" 
                            className="input-field"
                            value={formData.position}
                            onChange={(e) => setFormData({...formData, position: e.target.value})}
                        />
                    </div>
                </div>

                <div className="form-actions">
                    <button type="submit" className="btn-save" disabled={loading}>
                        {loading ? 'INSCRIPTION...' : 'AJOUTER AU DICTIONNAIRE'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddEventTypePage;