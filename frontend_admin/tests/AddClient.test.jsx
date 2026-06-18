import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AddClient from '../pages/Add_clients';

// On simule fetch (utilisé à la place d'axios dans ce composant)
global.fetch = jest.fn();

const renderAddClient = () =>
  render(<MemoryRouter><AddClient /></MemoryRouter>);

describe('AddClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Réponse par défaut pour getPalettes.php
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ palettes: [{ id: 'default', label: 'Défaut' }] }),
    });
  });

  test('affiche le titre "Ajouter un client"', async () => {
    renderAddClient();
    await waitFor(() =>
      expect(screen.getByText('Ajouter un client')).toBeInTheDocument()
    );
  });

  test('affiche tous les champs du formulaire', async () => {
    renderAddClient();
    await waitFor(() => screen.getByText('Ajouter un client'));

    // Vérifie la présence des labels
    expect(screen.getByText('N° de site')).toBeInTheDocument();
    expect(screen.getByText('Email Contact')).toBeInTheDocument();
    expect(screen.getByText('URL Dolibarr')).toBeInTheDocument();
    expect(screen.getByText("Nom d'utilisateur")).toBeInTheDocument();
    expect(screen.getByText('Clé API Dolibarr')).toBeInTheDocument();
    expect(screen.getByText(/Domaine/)).toBeInTheDocument();
    expect(screen.getByText('URL Logo Client')).toBeInTheDocument();
  });

  test('auto-complète le domaine quand on saisit un email', async () => {
    renderAddClient();
    await waitFor(() => screen.getByText('Ajouter un client'));

    const emailInput = screen.getByDisplayValue('');
    // On cible l'input email spécifiquement par son type
    const inputs = screen.getAllByRole('textbox');
    // L'input email a le type "email", on le trouve via le label
    const emailField = screen.getByLabelText('Email Contact');
    fireEvent.change(emailField, { target: { value: 'contact@monentreprise.com' } });

    // Le champ "Domaine" doit être rempli automatiquement
    await waitFor(() => {
      const domainField = screen.getByLabelText(/Domaine/);
      expect(domainField.value).toBe('monentreprise.com');
    });
  });

  test('affiche un message de succès après création réussie', async () => {
    // Premier appel : getPalettes ; deuxième appel : createClient
    global.fetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ palettes: [{ id: 'default', label: 'Défaut' }] }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      });

    renderAddClient();
    await waitFor(() => screen.getByText('Ajouter un client'));

    // Remplir les champs obligatoires
    fireEvent.change(screen.getByLabelText('N° de site'),       { target: { value: 'S001' } });
    fireEvent.change(screen.getByLabelText('Email Contact'),    { target: { value: 'admin@test.fr' } });
    fireEvent.change(screen.getByLabelText('URL Dolibarr'),     { target: { value: 'https://dolibarr.test.fr' } });
    fireEvent.change(screen.getByLabelText("Nom d'utilisateur"),{ target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Clé API Dolibarr'), { target: { value: 'cle123' } });
    fireEvent.change(screen.getByLabelText('URL Logo Client'),  { target: { value: 'https://logo.test.fr/logo.png' } });

    fireEvent.click(screen.getByText('Enregistrer le client'));

    await waitFor(() =>
      expect(screen.getByText(/client configuré avec succès/i)).toBeInTheDocument()
    );
  });

  test('affiche un message d\'erreur si le serveur renvoie une erreur', async () => {
    global.fetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ palettes: [{ id: 'default', label: 'Défaut' }] }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Domaine déjà existant' }),
      });

    renderAddClient();
    await waitFor(() => screen.getByText('Ajouter un client'));

    fireEvent.change(screen.getByLabelText('N° de site'),       { target: { value: 'S001' } });
    fireEvent.change(screen.getByLabelText('Email Contact'),    { target: { value: 'admin@test.fr' } });
    fireEvent.change(screen.getByLabelText('URL Dolibarr'),     { target: { value: 'https://dolibarr.test.fr' } });
    fireEvent.change(screen.getByLabelText("Nom d'utilisateur"),{ target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Clé API Dolibarr'), { target: { value: 'cle123' } });
    fireEvent.change(screen.getByLabelText('URL Logo Client'),  { target: { value: 'https://logo.test.fr/logo.png' } });

    fireEvent.click(screen.getByText('Enregistrer le client'));

    await waitFor(() =>
      expect(screen.getByText(/domaine déjà existant/i)).toBeInTheDocument()
    );
  });

  test('affiche une erreur réseau si fetch échoue', async () => {
    global.fetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ palettes: [] }),
      })
      .mockRejectedValueOnce(new Error('Réseau indisponible'));

    renderAddClient();
    await waitFor(() => screen.getByText('Ajouter un client'));

    fireEvent.change(screen.getByLabelText('N° de site'),       { target: { value: 'S001' } });
    fireEvent.change(screen.getByLabelText('Email Contact'),    { target: { value: 'admin@test.fr' } });
    fireEvent.change(screen.getByLabelText('URL Dolibarr'),     { target: { value: 'https://dolibarr.test.fr' } });
    fireEvent.change(screen.getByLabelText("Nom d'utilisateur"),{ target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Clé API Dolibarr'), { target: { value: 'cle123' } });
    fireEvent.change(screen.getByLabelText('URL Logo Client'),  { target: { value: 'https://logo.test.fr/logo.png' } });

    fireEvent.click(screen.getByText('Enregistrer le client'));

    await waitFor(() =>
      expect(screen.getByText(/impossible de contacter le serveur/i)).toBeInTheDocument()
    );
  });
});