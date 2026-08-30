import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { db } from '@/lib/db/database';
import { whiteboardsRepository } from '@/lib/db/whiteboards.repository';
import WhiteboardsPage from './WhiteboardsPage';

function EditorRoute() {
  const { whiteboardId } = useParams();
  return <p>Editor {whiteboardId}</p>;
}

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={['/whiteboards']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/whiteboards" element={<WhiteboardsPage />} />
        <Route path="/whiteboards/:whiteboardId" element={<EditorRoute />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('WhiteboardsPage', () => {
  beforeEach(async () => {
    await db.whiteboards.clear();
  });

  it('lists saved whiteboards', async () => {
    await whiteboardsRepository.create({ title: 'System map' });
    renderPage();

    expect(await screen.findByText('System map')).toBeTruthy();
    expect(screen.getByText(/1 board ·/)).toBeTruthy();
  });

  it('creates a whiteboard and opens its editor', async () => {
    renderPage();

    fireEvent.click(screen.getAllByRole('button', { name: 'New whiteboard' })[0]!);

    await waitFor(() => expect(screen.getByText(/^Editor /)).toBeTruthy());
    expect(await db.whiteboards.count()).toBe(1);
  });
});
