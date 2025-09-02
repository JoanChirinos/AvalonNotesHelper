import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPlayers, addPlayer, Player as PlayerType } from "../api/playersApi";
import Player from "./Player";
import { useState } from "react";

function PlayersList() {
  const queryClient = useQueryClient();
  const { data: players } = useQuery<PlayerType[]>({
    queryKey: ["players"],
    queryFn: fetchPlayers,
    refetchInterval: 5000,
  });
  const [newName, setNewName] = useState("");

  const handleAdd = async () => {
    if (!newName) return;
    await addPlayer({ name: newName });
    setNewName("");
    queryClient.invalidateQueries({ queryKey: ["players"] });
  };

  return (
    <div className="container mt-4">
      <ul className="list-group mb-3">
        {(players ?? []).map((player: PlayerType) => (
          <Player key={player.id} player={player} />
        ))}
      </ul>
      <div className="input-group">
        <input
          type="text"
          className="form-control"
          placeholder="New player name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button className="btn btn-primary" onClick={handleAdd}>
          Add Player
        </button>
      </div>
    </div>
  );
}

export default PlayersList;
