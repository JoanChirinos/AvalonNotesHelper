import React from "react";
import { useParams } from "react-router-dom";

export default function AvalonGame() {
  const { game_id } = useParams();
  return <h1>Avalon Game Page for Game ID: {game_id}</h1>;
}
