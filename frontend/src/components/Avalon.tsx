
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchGames, Game } from "../api/gamesApi";


export default function Avalon() {
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    // Fetch games every 5 seconds
    const getGames = async () => {
      setGames(await fetchGames());
    };
    getGames();
    const interval = setInterval(getGames, 5000);
    return () => clearInterval(interval);
  }, []);


  return (
    <>
      <nav className="navbar navbar-expand-md navbar-dark bg-dark">
        <div className="container-fluid d-flex justify-content-between">
          <Link className="navbar-brand" to="/avalon">Avalon Notes Helper</Link>
        </div>
      </nav>
      <main className="container mt-3">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="mb-0">Active Games</h2>
              <button
                id="new-game-button"
                className="btn btn-success"
                onClick={async () => {
                  const res = await fetch("/api/avalon/new_game", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" }
                  });
                  const data = await res.json();
                  const gameId = data.game?.id;
                  if (gameId) {
                    window.location.href = `/avalon/game/${gameId}`;
                  } else {
                    alert("Failed to create game.");
                  }
                }}
              >
                New Game
              </button>
            </div>
            <div id="games-list">
              {games.sort((a, b) => b.start_time.localeCompare(a.start_time)).map(game => (
                <Link
                  key={game.game_id}
                  to={`/avalon/game/${game.game_id}`}
                  style={{ textDecoration: "none" }}
                >
                  <div className="card mb-3 shadow-sm">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <span>Started: <strong>{game.start_time}</strong></span>
                      <span className="badge bg-secondary">{game.player_count} Players</span>
                    </div>
                    <div className="card-body py-2">
                      <div className="d-flex flex-wrap align-items-center">
                        {game.player_names.sort().map(player_name => (
                          <span
                            key={player_name}
                            className="badge bg-primary me-1 mb-1"
                            style={{ fontSize: "1rem" }}
                          >
                            {player_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
