import { useParams } from 'react-router-dom';

import GameClient from '@/components/GameClient';

export default function GamePage() {
  const { id } = useParams();
  return <GameClient initialGameId={id} />;
}
