
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AvalonGameSetup() {
  const [existingPlayers, setExistingPlayers] = useState<string[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [gamePlayers, setGamePlayers] = useState<string[]>([]);
  const navigate = useNavigate();

  // Poll for players in game
  useEffect(() => {
    const fetchGamePlayers = async () => {
      // Replace with your backend endpoint
      const res = await fetch("/api/avalon/game/123/players/game_setup_players_in_game");
      const data = await res.json();
      setGamePlayers(data.players || []);
    };
    fetchGamePlayers();
    const interval = setInterval(fetchGamePlayers, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch valid existing players
  useEffect(() => {
    const fetchExistingPlayers = async () => {
      // Replace with your backend endpoint
      const res = await fetch("/api/avalon/game/123/valid_players");
      const data = await res.json();
      setExistingPlayers(data.players || []);
    };
    fetchExistingPlayers();
  }, []);

  // Add existing player
  const addExistingPlayer = async () => {
    if (selectedPlayer) {
      await fetch("/api/avalon/game/123/add_player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: selectedPlayer }),
      });
      setSelectedPlayer("");
    }
  };

  // Add new player
  const addNewPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlayerName.trim()) {
      await fetch("/api/avalon/game/123/add_player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_name: newPlayerName.trim() }),
      });
      setNewPlayerName("");
    }
  };

  const startGame = async () => {
    const res = await fetch("/api/avalon/new_game", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const data = await res.json();
    const gameId = data.game?.id;
    if (gameId) {
      navigate(`/avalon/game/${gameId}`);
    } else {
      alert("Failed to create game.");
    }
  };

  return (
    <div className="container mt-3">
      <h2 className="mb-3">Game Setup</h2>
      <div className="card mb-4">
        <div className="card-header">
          <h5>Add Player</h5>
        </div>
        <div className="card-body">
          <div className="container-fluid mb-3">
            <form onSubmit={e => { e.preventDefault(); addExistingPlayer(); }}>
              <div className="row mb-2 align-items-end">
                <div className="col-sm-3">
                  <span className="btn btn-light disabled w-100 mb-0">Choose Player</span>
                </div>
                <div className="col-sm-7">
                  <select
                    id="player-select"
                    className="form-select text-muted"
                    value={selectedPlayer}
                    onChange={e => setSelectedPlayer(e.target.value)}
                  >
                    <option value="">Select player</option>
                    {existingPlayers.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="col-sm-2">
                  <button className="btn btn-primary w-100" type="submit" disabled={!selectedPlayer}>Add</button>
                </div>
              </div>
            </form>
            <form onSubmit={addNewPlayer}>
              <div className="row mb-2 align-items-end">
                <div className="col-sm-3">
                  <label htmlFor="new-player-name" className="btn btn-light disabled w-100 mb-0">New player</label>
                </div>
                <div className="col-sm-7">
                  <input
                    id="new-player-name"
                    type="text"
                    className="form-control"
                    placeholder="New player name"
                    value={newPlayerName}
                    onChange={e => setNewPlayerName(e.target.value)}
                    required
                  />
                </div>
                <div className="col-sm-2">
                  <button className="btn btn-success w-100" type="submit">Add</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5>Players in Game</h5>
        </div>
        <div className="card-body" id="players-in-game">
          {gamePlayers.map((p, idx) => (
            <div key={idx} className="game-setup-player list-group-item">{p}</div>
          ))}
        </div>
      </div>
      <div className="d-flex justify-content-end">
        <button className="btn btn-warning" id="start-game-btn" onClick={startGame}>Start Game</button>
      </div>
    </div>
  );
}
