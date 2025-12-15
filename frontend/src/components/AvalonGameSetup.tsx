
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import AvalonNav from "./AvalonNav";

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

  // Roles state
  const [availableRoles, setAvailableRoles] = useState<{ value: string; label: string; evil: boolean }[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [loyalServantCount, setLoyalServantCount] = useState<number>(0);
  const [minionCount, setMinionCount] = useState<number>(0);

  // Fetch game players function
  const fetchGamePlayers = React.useCallback(async () => {
    const res = await fetch(`/api/avalon/game/${game_id}/players`);
    const data = await res.json();
    setGamePlayers(data.players || []);
  }, [game_id]);

  // Fetch available roles (single-instance defs)
  const fetchAvailableRoles = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/avalon/roles`);
      if (!res.ok) return;
      const data = await res.json();
      setAvailableRoles(data.roles || []);
    } catch (err) {
      console.error("Failed to fetch available roles", err);
    }
  }, []);

  // Fetch roles/counts currently attached to this game
  const fetchGameRoles = React.useCallback(async () => {
    if (!game_id) return;
    try {
      const res = await fetch(`/api/avalon/game/${game_id}/roles`);
      if (!res.ok) {
        // Endpoint may not exist yet on the backend; skip silently
        return;
      }
      const data = await res.json();
      const roles: string[] = data.roles || [];
      // Exclude duplicate-count roles from the selected set
      const singleRoles = roles.filter(r => r !== "LOYAL_SERVANT" && r !== "MINION");
      setSelectedRoles(new Set(singleRoles));
      setLoyalServantCount(Number(data.loyalServantCount ?? 0));
      setMinionCount(Number(data.minionCount ?? 0));
    } catch (err) {
      console.error("Failed to fetch game roles", err);
    }
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

  // Poll for available roles
  useEffect(() => {
    fetchAvailableRoles();
    const intervalRoles = setInterval(fetchAvailableRoles, 5000);
    return () => clearInterval(intervalRoles);
  }, [fetchAvailableRoles]);

  // Poll for roles/counts on the game
  useEffect(() => {
    fetchGameRoles();
    const intervalGameRoles = setInterval(fetchGameRoles, 5000);
    return () => clearInterval(intervalGameRoles);
  }, [game_id, fetchGameRoles]);

  // Poll for valid existing players
  useEffect(() => {
    fetchValidPlayers();
    const intervalValid = setInterval(fetchValidPlayers, 5000);
    return () => clearInterval(intervalValid);
  }, [game_id, fetchValidPlayers]);

  // Add existing player
  const addValidPlayer = async (playerId: string | null) => {
    const playerToAdd = playerId ?? selectedPlayer;
    if (playerToAdd) {
      await fetch(`/api/avalon/game/${game_id}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: playerToAdd }),
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
    // Ensure role totals match player count before starting
    const totalRoles = selectedRoles.size + loyalServantCount + minionCount;
    if (totalRoles !== gamePlayers.length) {
      // button should be disabled already; guard here as well
      return;
    }
    await fetch(`/api/avalon/game/${game_id}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }).then(() => navigate(`/avalon/game/${game_id}`)).then(() => window.location.reload()); // Force reload to update immediately
  };

  // Toggle a single-instance role on/off and persist to backend
  const toggleRole = async (roleName: string) => {
    if (!game_id) return;
    // Prevent adding a role if it would exceed player count
    const currentTotal = selectedRoles.size + loyalServantCount + minionCount;
    if (!selectedRoles.has(roleName) && currentTotal + 1 > gamePlayers.length) return;
    try {
      if (selectedRoles.has(roleName)) {
        await fetch(`/api/avalon/game/${game_id}/remove_role`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roleName }),
        });
      } else {
        await fetch(`/api/avalon/game/${game_id}/roles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roleName }),
        });
      }
      await fetchGameRoles();
    } catch (err) {
      console.error("Failed to toggle role", err);
    }
  };

  // Set count for duplicate roles (LOYAL_SERVANT or MINION)
  const setRoleCount = async (roleName: "LOYAL_SERVANT" | "MINION", count: number) => {
    if (!game_id) return;
    if (count < 0) return;
    // Ensure the combined total (single-instance roles + both duplicate-role counts) doesn't exceed player count
    const singleCount = selectedRoles.size;
    const otherCount = roleName === 'LOYAL_SERVANT' ? minionCount : loyalServantCount;
    const maxAllowed = Math.max(0, gamePlayers.length - singleCount - otherCount);
    if (count > maxAllowed) count = maxAllowed;
    try {
      await fetch(`/api/avalon/game/${game_id}/set_role_count`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleName, count }),
      });
      await fetchGameRoles();
    } catch (err) {
      console.error("Failed to set role count", err);
    }
  };

  // Derived totals for validation/UI
  const totalRoles = selectedRoles.size + loyalServantCount + minionCount;
  const startDisabled = totalRoles !== gamePlayers.length;

  return (
    <>
      <AvalonNav />
      <div className="container my-3">
        <h2 className="mb-3">Game Setup</h2>
        <div className="card mb-4">
          <div className="card-header">
            <h5>Add Player</h5>
          </div>
          <div className="card-body">
            <div className="container-fluid mb-3">
              <form onSubmit={e => e.preventDefault()}>
                <div className="row mb-2 align-items-end">
                  <div className="col-sm-3">
                    <span className="btn border-0 disabled w-100 mb-0">Choose Player</span>
                  </div>
                  <div className="col-sm-7">
                    <select
                      id="player-select"
                      className="form-select text-muted"
                      value={selectedPlayer}
                      onChange={e => { setSelectedPlayer(e.target.value); addValidPlayer(e.target.value); }}
                    >
                      <option className="d-none" value="" disabled>Select player</option>
                      {validPlayers.sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                        <option className="text-dark" key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </form>
              <form onSubmit={addNewPlayer}>
                <div className="row mb-2 align-items-end">
                  <div className="col-sm-3">
                    <label htmlFor="new-player-name" className="btn border-0 disabled w-100 mb-0">New player</label>
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
            <span className="badge bg-secondary">{gamePlayers.length} Players</span>
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
        <div className="card mb-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5>Roles</h5>
            <span className="badge bg-secondary">{selectedRoles.size + loyalServantCount + minionCount} Roles</span>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <div>
                {availableRoles
                  .filter(r => r.value !== "LOYAL_SERVANT" && r.value !== "MINION" && r.evil === false)
                  .map(r => {
                    const roleValue = String(r.value);
                    const isSelected = selectedRoles.has(roleValue);
                    const wouldExceed = !isSelected && (selectedRoles.size + loyalServantCount + minionCount + 1 > gamePlayers.length);
                    return (
                      <button
                        key={roleValue}
                        className={`btn me-2 mb-2 ${isSelected ? 'btn-success' : 'btn-outline-secondary'}`}
                        aria-pressed={isSelected}
                        aria-label={`Toggle ${r.label}`}
                        onClick={() => toggleRole(roleValue)}
                        disabled={wouldExceed}
                        title={wouldExceed ? `Cannot add role — would exceed players (${gamePlayers.length})` : `Toggle ${r.label}`}
                      >
                        {r.label}
                      </button>
                    );
                  })}
              </div>
            </div>
            <hr/>
            <div className="mb-3">
              <div>
                {availableRoles
                  .filter(r => r.value !== "LOYAL_SERVANT" && r.value !== "MINION" && r.evil === true)
                  .map(r => {
                    const roleValue = String(r.value);
                    const isSelected = selectedRoles.has(roleValue);
                    const wouldExceed = !isSelected && (selectedRoles.size + loyalServantCount + minionCount + 1 > gamePlayers.length);
                    return (
                      <button
                        key={roleValue}
                        className={`btn me-2 mb-2 ${isSelected ? 'btn-danger' : 'btn-outline-secondary'}`}
                        aria-pressed={isSelected}
                        aria-label={`Toggle ${r.label}`}
                        onClick={() => toggleRole(roleValue)}
                        disabled={wouldExceed}
                        title={wouldExceed ? `Cannot add role — would exceed players (${gamePlayers.length})` : `Toggle ${r.label}`}
                      >
                        {r.label}
                      </button>
                    );
                  })}
              </div>
            </div>
            <div className="mb-3">
              <div className="d-flex align-items-center justify-content-around">
                <div className="me-4">
                  <div>Loyal Servant of Arthur</div>
                  <div className="input-group">
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      aria-label="decrease loyal"
                      onClick={() => setRoleCount('LOYAL_SERVANT', Math.max(0, loyalServantCount - 1))}
                      disabled={loyalServantCount <= 0}
                    >
                      -
                    </button>
                    <span className="input-group-text">{loyalServantCount}</span>
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      aria-label="increase loyal"
                      onClick={() => setRoleCount('LOYAL_SERVANT', loyalServantCount + 1)}
                      disabled={selectedRoles.size + loyalServantCount + minionCount >= gamePlayers.length}
                      title={selectedRoles.size + loyalServantCount + minionCount >= gamePlayers.length ? `Cannot add — would exceed players (${gamePlayers.length})` : 'Increase loyal servant count'}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <div>Minion of Mordred</div>
                  <div className="input-group">
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      aria-label="decrease minion"
                      onClick={() => setRoleCount('MINION', Math.max(0, minionCount - 1))}
                      disabled={minionCount <= 0}
                    >
                      -
                    </button>
                    <span className="input-group-text">{minionCount}</span>
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      aria-label="increase minion"
                      onClick={() => setRoleCount('MINION', minionCount + 1)}
                      disabled={selectedRoles.size + loyalServantCount + minionCount >= gamePlayers.length}
                      title={selectedRoles.size + loyalServantCount + minionCount >= gamePlayers.length ? `Cannot add — would exceed players (${gamePlayers.length})` : 'Increase minion count'}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="d-flex justify-content-end">
          <button
            className="btn btn-warning"
            id="start-game-btn"
            onClick={startGame}
            disabled={startDisabled}
            title={startDisabled ? `Roles (${totalRoles}) must equal players (${gamePlayers.length})` : "Start game"}
          >
            Start Game
          </button>
        </div>
      </div>
    </>
  );
}
