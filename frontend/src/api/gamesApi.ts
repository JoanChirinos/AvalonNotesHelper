export type Game = {
  game_id: string;
  start_time: string;
  player_count: number;
  player_names: string[];
  active: boolean;
};

export async function fetchGames(): Promise<Game[]> {
  try {
    const res = await fetch("/api/avalon/landing/games");
    const data = await res.json();
    return data.games || [];
  } catch {
    return [];
  }
}
