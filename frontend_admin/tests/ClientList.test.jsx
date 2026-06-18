import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import ClientList from '../pages/ClientList';

jest.mock('axios');

const mockClients = [
  {
    id: 1,
    domain: 'exemple.com',
    site_number: 'S001',
    email: 'contact@exemple.com',
    username: 'admin1',
    dolibarr_url: 'https://dolibarr.exemple.com',
    dolibarr_api_key: 'abc123def456',
    logo: '',
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 2,
    domain: 'test.fr',
    site_number: 'S002',
    email: 'info@test.fr',
    username: 'admin2',
    dolibarr_url: 'https://dolibarr.test.fr',
    dolibarr_api_key: 'xyz789uvw012',
    logo: '',
    created_at: '2024-02-20T10:00:00Z',
  },
];

const renderClientList = () =>
  render(<MemoryRouter><ClientList /></MemoryRouter>);

describe('ClientList', () => {
  beforeEach(() => jest.clearAllMocks());

  test('affiche le loader pendant le chargement', () => {
    axios.get.mockReturnValue(new Promise(() => {}));
    renderClientList();
    expect(screen.getByText(/chargement des données/i)).toBeInTheDocument();
  });

  test('affiche la liste des clients après chargement', async () => {
    axios.get.mockResolvedValue({ data: mockClients });
    renderClientList();

    await waitFor(() =>
      expect(screen.getByText('exemple.com')).toBeInTheDocument()
    );
    expect(screen.getByText('test.fr')).toBeInTheDocument();
  });

  test('affiche le titre "Base de Données Clients"', async () => {
    axios.get.mockResolvedValue({ data: mockClients });
    renderClientList();

    await waitFor(() =>
      expect(screen.getByText('Base de Données Clients')).toBeInTheDocument()
    );
  });

  test('filtre les clients selon le terme de recherche', async () => {
    axios.get.mockResolvedValue({ data: mockClients });
    renderClientList();

    await waitFor(() => screen.getByText('exemple.com'));

    // On tape "test" dans la barre de recherche
    const searchInput = screen.getByPlaceholderText(/rechercher par domaine/i);
    fireEvent.change(searchInput, { target: { value: 'test' } });

    // "test.fr" doit rester visible, "exemple.com" doit disparaître
    expect(screen.getByText('test.fr')).toBeInTheDocument();
    expect(screen.queryByText('exemple.com')).not.toBeInTheDocument();
  });

  test('filtre par numéro de site', async () => {
    axios.get.mockResolvedValue({ data: mockClients });
    renderClientList();

    await waitFor(() => screen.getByText('exemple.com'));

    const searchInput = screen.getByPlaceholderText(/rechercher par domaine/i);
    fireEvent.change(searchInput, { target: { value: 'S001' } });

    expect(screen.getByText('exemple.com')).toBeInTheDocument();
    expect(screen.queryByText('test.fr')).not.toBeInTheDocument();
  });

  test('tronque la clé API affichée (10 caractères + "...")', async () => {
    axios.get.mockResolvedValue({ data: mockClients });
    renderClientList();

    await waitFor(() => screen.getByText('exemple.com'));

    // "abc123def456" → affichée comme "abc123def4..."
    expect(screen.getByText('abc123def4...')).toBeInTheDocument();
  });

  test('gère un tableau vide sans erreur', async () => {
    axios.get.mockResolvedValue({ data: [] });
    renderClientList();

    await waitFor(() =>
      expect(screen.getByText('Base de Données Clients')).toBeInTheDocument()
    );
    // Aucun client affiché, aucune erreur
    expect(screen.queryByText('exemple.com')).not.toBeInTheDocument();
  });

  test('gère une erreur API sans planter', async () => {
    axios.get.mockRejectedValue(new Error('Erreur serveur'));
    renderClientList();

    // Même en cas d'erreur, le titre doit s'afficher (liste vide)
    await waitFor(() =>
      expect(screen.getByText('Base de Données Clients')).toBeInTheDocument()
    );
  });
});