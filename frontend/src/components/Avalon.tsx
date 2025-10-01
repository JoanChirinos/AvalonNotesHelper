
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../ThemeContext";
import { fetchGames, Game } from "../api/gamesApi";

import AvalonNav from "./AvalonNav";


export default function Avalon() {
  const { theme, toggleTheme, notTheme } = useTheme();
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    // Fetch games every second
    const getGames = async () => {
      setGames(await fetchGames());
    };
    getGames();
    const interval = setInterval(getGames, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleNewGame = async () => {
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
  };

  return (
    <>
      <AvalonNav />
      <main className="container mt-3">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="mb-0">Active Games</h2>
              <button
                id="new-game-button"
                className="btn btn-success"
                onClick={async () => handleNewGame()}
              >
                New Game
              </button>
            </div>
            <div id="active-games-list">
              {games.filter(game => game.active).map(game => (
                <Link
                  key={game.game_id}
                  to={`/avalon/game/${game.game_id}`}
                  style={{ textDecoration: "none" }}
                >
                  <div className="card mb-3 shadow-sm">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <span>Started: <strong>{game.start_time}</strong></span>
                      <span>
                        <span className={`badge ${game.in_setup ? "bg-warning" : "bg-success"} mx-1`}>
                          {game.in_setup ? "Setup" : "In Progress"}
                        </span>
                        <span className="badge bg-secondary mx-1">{game.player_count} Players</span>
                      </span>
                    </div>
                    <div className="card-body py-2">
                      <div className="d-flex flex-wrap align-items-center">
                        {game.player_names.map(player_name => (
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
        <div className="row justify-content-center mt-4">
          <div className="col-md-8">
              <h2 className="mb-3">Archived Games</h2>
              <div id="active-games-list">
              {games.filter(game => !game.active).map(game => (
                <Link
                  key={game.game_id}
                  to={`/avalon/game/${game.game_id}`}
                  style={{ textDecoration: "none" }}
                >
                  <div className="card mb-3 shadow-sm">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <span>Started: <strong>{game.start_time}</strong></span>
                      <span>
                        <span className={`badge ${game.good_won ? "bg-success" : "bg-danger"} mx-1`}>
                          {game.good_won ? "Good Win" : "Evil Win"}
                        </span>
                        <span className="badge bg-secondary mx-1">{game.player_count} Players</span>
                      </span>
                    </div>
                    <div className="card-body py-2">
                      <div className="d-flex flex-wrap align-items-center">
                        {game.player_names.map(player_name => (
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
