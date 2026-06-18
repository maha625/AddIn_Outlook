import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import Dashboard from '../pages/Dashboard';

// On simule axios pour ne pas faire de vraies requêtes réseau
jest.mock('axios');

// On simule recharts car il ne fonctionne pas bien dans l'environnement de test
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  LineChart:           ({ children }) => <div>{children}</div>,
  BarChart:            ({ children }) => <div>{children}</div>,
  Line:                () => null,
  Bar:                 () => null,
  XAxis:               () => null,
  YAxis:               () => null,
  CartesianGrid:       () => null,
  Tooltip:             () => null,
}));

// Données fictives retournées par l'API
const mockClients = [
  { id: 1, domain: 'exemple.com', site_number: 'S001', logo: '', created_at: '2024-01-15T10:00:00Z' },
  { id: 2, domain: 'test.fr',     site_number: 'S002', logo: '', created_at: '2024-02-20T10:00:00Z' },
];

const mockStats        = { totalEventTypes: 5, totalButtons: 12 };
const mockMonthly      = [{ month_name: 'Janvier', total: 3 }];
const mockClientEvents = [{ username: 'exemple.com', total_events: 8 }];

// Helper pour rendre le composant avec le routeur
const renderDashboard = () =>
  render(<MemoryRouter><Dashboard /></MemoryRouter>);

describe('Dashboard', () => {
  beforeEach(() => {
    // Réinitialise les mocks avant chaque test
    jest.clearAllMocks();
  });

  test('affiche le loader pendant le chargement', () => {
    // Les promesses ne se résolvent jamais → le loader reste visible
    axios.get.mockReturnValue(new Promise(() => {}));
    renderDashboard();
    expect(screen.getByText(/initialisation du panel/i)).toBeInTheDocument();
  });

  test('affiche le titre "Tableau de Bord" après chargement', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('getClients'))        return Promise.resolve({ data: mockClients });
      if (url.includes('getDashboardStats')) return Promise.resolve({ data: mockStats });
      if (url.includes('getClientsPerMonth'))return Promise.resolve({ data: { success: true, data: mockMonthly } });
      if (url.includes('getEventsPerClient'))return Promise.resolve({ data: { success: true, data: mockClientEvents } });
      return Promise.resolve({ data: {} });
    });

    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText('Tableau de Bord')).toBeInTheDocument()
    );
  });

  test('affiche le nombre total de clients', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('getClients'))        return Promise.resolve({ data: mockClients });
      if (url.includes('getDashboardStats')) return Promise.resolve({ data: mockStats });
      if (url.includes('getClientsPerMonth'))return Promise.resolve({ data: { success: true, data: mockMonthly } });
      if (url.includes('getEventsPerClient'))return Promise.resolve({ data: { success: true, data: mockClientEvents } });
      return Promise.resolve({ data: {} });
    });

    renderDashboard();
    // mockClients contient 2 clients → la carte doit afficher "2"
    await waitFor(() =>
      expect(screen.getByText('2')).toBeInTheDocument()
    );
  });

  test('affiche le dernier client ajouté', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('getClients'))        return Promise.resolve({ data: mockClients });
      if (url.includes('getDashboardStats')) return Promise.resolve({ data: mockStats });
      if (url.includes('getClientsPerMonth'))return Promise.resolve({ data: { success: true, data: mockMonthly } });
      if (url.includes('getEventsPerClient'))return Promise.resolve({ data: { success: true, data: mockClientEvents } });
      return Promise.resolve({ data: {} });
    });

    renderDashboard();
    // Le premier client du tableau est "exemple.com"
    await waitFor(() =>
      expect(screen.getByText('exemple.com')).toBeInTheDocument()
    );
  });

  test('affiche "Opérationnelle" quand l\'API répond', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('getClients'))        return Promise.resolve({ data: mockClients });
      if (url.includes('getDashboardStats')) return Promise.resolve({ data: mockStats });
      if (url.includes('getClientsPerMonth'))return Promise.resolve({ data: { success: true, data: mockMonthly } });
      if (url.includes('getEventsPerClient'))return Promise.resolve({ data: { success: true, data: mockClientEvents } });
      return Promise.resolve({ data: {} });
    });

    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText('Opérationnelle')).toBeInTheDocument()
    );
  });

  test('affiche "Indisponible" en cas d\'erreur API', async () => {
    axios.get.mockRejectedValue(new Error('Erreur réseau'));

    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText('Indisponible')).toBeInTheDocument()
    );
  });

  test('affiche le nombre de types d\'événements depuis getDashboardStats', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('getClients'))        return Promise.resolve({ data: mockClients });
      if (url.includes('getDashboardStats')) return Promise.resolve({ data: mockStats });
      if (url.includes('getClientsPerMonth'))return Promise.resolve({ data: { success: true, data: mockMonthly } });
      if (url.includes('getEventsPerClient'))return Promise.resolve({ data: { success: true, data: mockClientEvents } });
      return Promise.resolve({ data: {} });
    });

    renderDashboard();
    // mockStats.totalEventTypes = 5
    await waitFor(() =>
      expect(screen.getByText('5')).toBeInTheDocument()
    );
  });
});