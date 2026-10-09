import { createBrowserRouter } from 'react-router-dom';

import RootLayout from './RootLayout';
import AboutPage from './pages/AboutPage';
import GamePage from './pages/GamePage';
import NotFoundPage from './pages/NotFoundPage';
import PaxHistoriaAlternativePage from './pages/PaxHistoriaAlternativePage';
import PrivacyPage from './pages/PrivacyPage';

// NOTE: Story Rooms (/story-room) was archived on 2026-07-02 — the local-only
// prototype split polish from the primary grand-strategy experience and had no
// path to the core loop. The route was removed from navigation; the code
// (StoryRoomPage, StoryRoomPrototype, story-room-fixtures) is retained in-repo
// as an archived experiment. See PROJECT_STATUS.md for the decision rationale.

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { path: 'play', element: <GamePage /> },
      { path: 'play/:id', element: <GamePage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: 'pax-historia-alternative', element: <PaxHistoriaAlternativePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
