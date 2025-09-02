import { Player as PlayerType } from "../api/playersApi";

interface PlayerProps {
  player: PlayerType;
}

function Player({ player }: PlayerProps) {
  return (
    <li className="list-group-item d-flex justify-content-between align-items-center">
      {player.name}
      <span className={`badge ${player.active ? "bg-success" : "bg-secondary"}`}>
        {player.active ? "Active" : "Inactive"}
      </span>
    </li>
  );
}

export default Player;
