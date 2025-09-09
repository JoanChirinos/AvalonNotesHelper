
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";

export default function AvalonGameSetup() {
  const { game_id } = useParams();
  const [validPlayers, setValidPlayers] = useState<{id: number, name: string, active: boolean}[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [gamePlayers, setGamePlayers] = useState<{
    id: number;
    gameId: string;
    playerId: number;
    role: string;
    player: { id: number; name: string; active: boolean };
  }[]>([]);
  const navigate = useNavigate();

  // Fetch game players function
  const fetchGamePlayers = React.useCallback(async () => {
    const res = await fetch(`/api/avalon/game/${game_id}/players`);
    const data = await res.json();
    setGamePlayers(data.players || []);
  }, [game_id]);

  // Fetch valid players function
  const fetchValidPlayers = React.useCallback(async () => {
    const res = await fetch(`/api/avalon/game/${game_id}/valid_players`);
    const data = await res.json();
    setValidPlayers(data.players || []);
  }, [game_id]);

  // Poll for players in game
  useEffect(() => {
    fetchGamePlayers();
    const intervalGame = setInterval(fetchGamePlayers, 5000);
    return () => clearInterval(intervalGame);
  }, [game_id, fetchGamePlayers]);

  // Poll for valid existing players
  useEffect(() => {
    fetchValidPlayers();
    const intervalValid = setInterval(fetchValidPlayers, 5000);
    return () => clearInterval(intervalValid);
  }, [game_id, fetchValidPlayers]);

  // Add existing player
  const addValidPlayer = async () => {
    if (selectedPlayer) {
      await fetch(`/api/avalon/game/${game_id}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: selectedPlayer }),
      });
      setSelectedPlayer("");
      // Refresh lists
      await fetchGamePlayers();
      await fetchValidPlayers();
    }
  };

  // Add new player
  const addNewPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlayerName.trim()) {
      await fetch(`/api/avalon/game/${game_id}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_name: newPlayerName.trim() }),
      });
      setNewPlayerName("");
      await fetchGamePlayers();
      await fetchValidPlayers();
    }
  };

  // Remove player from game
  const removePlayer = async (id: number) => {
    await fetch(`/api/avalon/game/${game_id}/remove_player`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchGamePlayers();
    await fetchValidPlayers();
  };

  const startGame = async () => {
    await fetch(`/api/avalon/game/${game_id}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }).then(() => navigate(`/avalon/game/${game_id}`)).then(() => window.location.reload()); // Force reload to update immediately
  };

  return (
    <>
      <nav className="navbar navbar-expand-md navbar-dark bg-dark">
        <div className="container-fluid d-flex justify-content-between">
          <Link className="navbar-brand" to="/avalon">Avalon Notes Helper</Link>
        </div>
      </nav>
      <div className="container mt-3">
        <h2 className="mb-3">Game Setup</h2>
        <div className="card mb-4">
          <div className="card-header">
            <h5>Add Player</h5>
          </div>
          <div className="card-body">
            <div className="container-fluid mb-3">
              <form onSubmit={e => { e.preventDefault(); addValidPlayer(); }}>
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
                      <option className="d-none" value="" disabled>Select player</option>
                      {validPlayers.sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                        <option className="text-dark" key={p.id} value={p.id}>{p.name}</option>
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
            {gamePlayers.map((p) => (
              <button
                className="btn btn-md me-2 mb-2 btn-outline-secondary game-setup-player"
                key={p.id}
                onClick={() => removePlayer(p.id)}
              >
                {p.player.name}
              </button>
            ))}
          </div>
        </div>
        <div className="d-flex justify-content-end">
          <button className="btn btn-warning" id="start-game-btn" onClick={startGame}>Start Game</button>
        </div>
      </div>
    </>
  );
}
