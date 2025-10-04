import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AvalonGameSetup from "./AvalonGameSetup";
import AvalonGame from "./AvalonGame";
import AvalonGameArchived from "./AvalonGameArchived";
import AvalonGameNotFound from "./AvalonGameNotFound";

interface Game {
    id: string;
    start_time: Date;
    active: boolean;
    archived: boolean;
    quests: { id: number; gameId: string; }[];
}

function AvalonGameRouter() {
  const { game_id } = useParams();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchGame() {
      const res = await fetch(`/api/avalon/game/${game_id}`);
      const data = await res.json();
      if (mounted) {
        setGame(data.game);
        setLoading(false);
      }
    }
    fetchGame();
    const interval = setInterval(fetchGame, 500);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [game_id]);

  if (loading) return <div>Loading...</div>;

  if (!game) return <AvalonGameNotFound />;
  if (game.active) {
    return game.quests && game.quests.length === 0
    ? <AvalonGameSetup />
    : <AvalonGame />;
  } else {
    return <AvalonGameArchived />;
  }
}

export default AvalonGameRouter;