import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditEventPage from '../pages/EditEventPage';

global.fetch = jest.fn();

// Événement fictif passé en props
const mockEvent = {
  code:     'RDV_TECH',
  libelle:  'Rendez-vous technique',
  color:    '#3498db',
  position: 10,
};

describe('EditEventPage', () => {
  beforeEach(() => jest.clearAllMocks());

  test('affiche le code de l\'événement dans le titre', () => {
    render(
      <EditEventPage
        event={mockEvent}
        onCancel={jest.fn()}
        onSave={jest.fn()}
      />
    );
    expect(screen.getByText(/RDV_TECH/)).toBeInTheDocument();
  });

  test('pré-remplit le champ libellé avec la valeur de l\'événement', () => {
    render(
      <EditEventPage
        event={mockEvent}
        onCancel={jest.fn()}
        onSave={jest.fn()}
      />
    );
    const libelleInput = screen.getByDisplayValue('Rendez-vous technique');
    expect(libelleInput).toBeInTheDocument();
  });

  test('met à jour le champ libellé quand on le modifie', () => {
    render(
      <EditEventPage
        event={mockEvent}
        onCancel={jest.fn()}
        onSave={jest.fn()}
      />
    );
    const input = screen.getByDisplayValue('Rendez-vous technique');
    fireEvent.change(input, { target: { value: 'Nouveau libellé', name: 'libelle' } });
    expect(input.value).toBe('Nouveau libellé');
  });

  test('appelle onCancel quand on clique sur "Annuler"', () => {
    const onCancel = jest.fn();
    render(
      <EditEventPage
        event={mockEvent}
        onCancel={onCancel}
        onSave={jest.fn()}
      />
    );
    fireEvent.click(screen.getByText('Annuler'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('appelle onSave après une sauvegarde réussie', async () => {
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    });

    const onSave = jest.fn();
    render(
      <EditEventPage
        event={mockEvent}
        onCancel={jest.fn()}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByText('Enregistrer'));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledTimes(1)
    );
  });

  test('affiche une alerte en cas d\'erreur serveur', async () => {
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: false, error: 'Code introuvable' }),
    });

    // On espionne window.alert pour intercepter le message
    jest.spyOn(window, 'alert').mockImplementation(() => {});

    const onSave = jest.fn();
    render(
      <EditEventPage
        event={mockEvent}
        onCancel={jest.fn()}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByText('Enregistrer'));

    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Code introuvable'))
    );
    // onSave ne doit PAS avoir été appelé
    expect(onSave).not.toHaveBeenCalled();
  });
});