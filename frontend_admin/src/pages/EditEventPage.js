import React, { useState } from 'react';
import { API_BACK_URL } from "../config/config";
import './EditEventPage.css';
const EditEventPage = ({ event, onCancel, onSave }) => {
    const [formData, setFormData] = useState({
        code: event.code,
        libelle: event.libelle,
        color: event.color || '#3498db',
        position: event.position || 0
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const response = await fetch(`${API_BACK_URL}/Edit_Type_Event.php?action=update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const result = await response.json();
        if (result.success) onSave();
        else alert("Erreur: " + result.error);
    };

    return (
        <div className="edit-overlay">
            <div className="edit-card">
                <h3>Modifier : {event.code}</h3>
                <form onSubmit={handleSubmit}>
                    <label>Libellé</label>
                    <input name="libelle" value={formData.libelle} onChange={handleChange} required />
                    
                    <label>Couleur</label>
                    <input type="color" name="color" value={formData.color} onChange={handleChange} />
                    
                    <label>Position</label>
                    <input type="number" name="position" value={formData.position} onChange={handleChange} />

                    <div className="form-actions">
                        <button type="button" className="cancel-btn" onClick={onCancel}>Annuler</button>
                        <button type="submit" className="save-btn">Enregistrer</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditEventPage;