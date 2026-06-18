import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import EditClient from '../pages/EditClient';

jest.mock('axios');
global.fetch = jest.fn();

// Données fictives du client retournées par l'API
const mockClientDetails = {
  success: true,
  client: {
    site_number:      'S001',
    email:            'admin@exemple.com',
    dolibarr_url:     'https://dolibarr.exemple.com',
    username:         'admin_exemple',
    dolibarr_api_key: 'cle_secrete_123',
    domain:           'exemple.com',
    logo:             'https://logo.exemple.com/logo.png',
    palette_id:       'default',
  },
  buttons: [
    {
      label:               'Appeler',
      bg_color:            '#2563eb',
      text_color:          '#ffffff',
      icon:                'telephone.svg',
      dolibarr_type_code:  'CALL',
      allow_linked_events: 1,
    },
  ],
};

// Helper : rend le composant avec un paramètre d'URL id=1
const renderEditClient = () =>
  render(
    <MemoryRouter initialEntries={['/edit-client/1']}>
      <Routes>
        <Route path="/edit-client/:id" element={<EditClient />} />
      </Routes>
    </MemoryRouter>
  );

describe('EditClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // fetch → palettes + icônes
    global.fetch.mockImplementation((url) => {
      if (url.includes('getPalettes'))
        return Promise.resolve({
          json: () => Promise.resolve({ palettes: [{ id: 'default', label: 'Défaut' }] }),
        });
      if (url.includes('icons.json'))
        return Promise.resolve({
          json: () => Promise.resolve([{ file: 'telephone.svg', label: 'Téléphone' }]),
        });
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    // axios.get → détails client + types d'événements
    axios.get.mockImplementation((url) => {
      if (url.includes('getClientDetails'))
        return Promise.resolve({ data: mockClientDetails });
      if (url.includes('GetDolibarrEventTypes'))
        return Promise.resolve({ data: { success: true, types: [{ code: 'CALL', label: 'Appel' }] } });
      return Promise.resolve({ data: {} });
    });
  });

  test('affiche le loader pendant le chargement', () => {
    // Axios ne se résout jamais → loader visible
    axios.get.mockReturnValue(new Promise(() => {}));
    renderEditClient();
    expect(screen.getByText('Chargement...')).toBeInTheDocument();
  });

  test('affiche le numéro de site dans le titre après chargement', async () => {
    renderEditClient();
    await waitFor(() =>
      expect(screen.getByText(/#S001/)).toBeInTheDocument()
    );
  });

  test('pré-remplit le champ email', async () => {
    renderEditClient();
    await waitFor(() =>
      expect(screen.getByDisplayValue('admin@exemple.com')).toBeInTheDocument()
    );
  });

  test('pré-remplit le champ username', async () => {
    renderEditClient();
    await waitFor(() =>
      expect(screen.getByDisplayValue('admin_exemple')).toBeInTheDocument()
    );
  });

  test('affiche le bouton existant du client', async () => {
    renderEditClient();
    await waitFor(() =>
      expect(screen.getByDisplayValue('Appeler')).toBeInTheDocument()
    );
  });

  test('ajoute un nouveau bouton quand on clique sur "+ Ajouter un bouton"', async () => {
    renderEditClient();
    await waitFor(() => screen.getByText('+ Ajouter un bouton'));

    fireEvent.click(screen.getByText('+ Ajouter un bouton'));

    // Il doit y avoir maintenant 2 champs de libellé de bouton
    await waitFor(() => {
      const inputs = screen.getAllByDisplayValue('Appeler');
      // Un seul "Appeler" car le nouveau est vide
      expect(inputs.length).toBe(1);
      // Le formulaire contient désormais 2 sections de boutons
      const labelInputs = screen.getAllByPlaceholderText('Ex: Appeler');
      expect(labelInputs.length).toBe(2);
    });
  });

  test('auto-complète le domaine quand l\'email change', async () => {
    renderEditClient();
    await waitFor(() => screen.getByDisplayValue('admin@exemple.com'));

    const emailInput = screen.getByDisplayValue('admin@exemple.com');
    fireEvent.change(emailInput, { target: { value: 'contact@nouveaudomaine.com', name: 'email' } });

    await waitFor(() => {
      const domainInput = screen.getByDisplayValue('nouveaudomaine.com');
      expect(domainInput).toBeInTheDocument();
    });
  });

  test('affiche un message de succès après mise à jour', async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });

    renderEditClient();
    await waitFor(() => screen.getByText('Enregistrer les modifications'));

    fireEvent.click(screen.getByText('Enregistrer les modifications'));

    await waitFor(() =>
      expect(screen.getByText(/mise à jour avec succès/i)).toBeInTheDocument()
    );
  });

  test('affiche une erreur si la mise à jour échoue', async () => {
    axios.post.mockResolvedValueOnce({ data: { success: false, error: 'Clé API invalide' } });

    renderEditClient();
    await waitFor(() => screen.getByText('Enregistrer les modifications'));

    fireEvent.click(screen.getByText('Enregistrer les modifications'));

    await waitFor(() =>
      expect(screen.getByText(/clé api invalide/i)).toBeInTheDocument()
    );
  });
});