import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AddEventTypePage from '../pages/Add_type_evenement';

global.fetch = jest.fn();

// Données fictives : liste d'utilisateurs (clients)
const mockUsers = [
  { id: 1, username: 'client_exemple' },
  { id: 2, username: 'client_test'    },
];

const renderPage = () =>
  render(<MemoryRouter><AddEventTypePage /></MemoryRouter>);

describe('AddEventTypePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Par défaut, le premier appel fetch retourne les utilisateurs
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve(mockUsers),
    });
  });

  test('affiche le titre de la page', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/nouveau type d'événement/i)).toBeInTheDocument()
    );
  });

  test('charge et affiche la liste des utilisateurs dans le select', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('client_exemple')).toBeInTheDocument()
    );
    expect(screen.getByText('client_test')).toBeInTheDocument();
  });

  test('affiche les champs Code, Libellé, Couleur et Position', async () => {
    renderPage();
    await waitFor(() => screen.getByText(/nouveau type/i));

    expect(screen.getByText(/Code/)).toBeInTheDocument();
    expect(screen.getByText('Libellé')).toBeInTheDocument();
    expect(screen.getByText('Couleur')).toBeInTheDocument();
    expect(screen.getByText('Position')).toBeInTheDocument();
  });

  test('convertit le code en majuscules automatiquement', async () => {
    renderPage();
    await waitFor(() => screen.getByText('client_exemple'));

    // Trouver l'input de type text qui correspond au code
    // Le champ Code est un input type="text" avec le placeholder vide
    const inputs = screen.getAllByRole('textbox');
    // Le premier textbox après le select est le champ Code
    const codeInput = inputs[0];

    fireEvent.change(codeInput, { target: { value: 'rdv_tech' } });
    expect(codeInput.value).toBe('RDV_TECH');
  });

  test('le bouton affiche "INSCRIPTION..." pendant l\'envoi', async () => {
    // Le deuxième fetch (soumission) ne se résout jamais → état loading permanent
    global.fetch.mockReturnValueOnce(new Promise(() => {}));

    renderPage();
    await waitFor(() => screen.getByText('client_exemple'));

    // Remplir les champs requis
    const selectUser = screen.getByRole('combobox');
    fireEvent.change(selectUser, { target: { value: '1' } });

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'RDV_TEST' } });
    fireEvent.change(inputs[1], { target: { value: 'Test libellé' } });

    fireEvent.click(screen.getByText('AJOUTER AU DICTIONNAIRE'));

    await waitFor(() =>
      expect(screen.getByText('INSCRIPTION...')).toBeInTheDocument()
    );
  });

  test('redirige après création réussie', async () => {
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    });
    jest.spyOn(window, 'alert').mockImplementation(() => {});

    renderPage();
    await waitFor(() => screen.getByText('client_exemple'));

    const selectUser = screen.getByRole('combobox');
    fireEvent.change(selectUser, { target: { value: '1' } });

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'RDV_TEST' } });
    fireEvent.change(inputs[1], { target: { value: 'Test libellé' } });

    fireEvent.click(screen.getByText('AJOUTER AU DICTIONNAIRE'));

    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining("intégré au dictionnaire Dolibarr")
      )
    );
  });

  test('affiche une alerte en cas d\'erreur Dolibarr', async () => {
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: false, error: 'Code déjà utilisé' }),
    });
    jest.spyOn(window, 'alert').mockImplementation(() => {});

    renderPage();
    await waitFor(() => screen.getByText('client_exemple'));

    const selectUser = screen.getByRole('combobox');
    fireEvent.change(selectUser, { target: { value: '1' } });

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'RDV_TEST' } });
    fireEvent.change(inputs[1], { target: { value: 'Test libellé' } });

    fireEvent.click(screen.getByText('AJOUTER AU DICTIONNAIRE'));

    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining('Code déjà utilisé')
      )
    );
  });
});