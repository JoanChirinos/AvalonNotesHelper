import axios from "axios";

export interface Player {
  id: number;
  name: string;
  active: boolean;
}

const API_URL = "http://localhost:5000/api/players";

export const fetchPlayers = async (): Promise<Player[]> => {
  const res = await axios.get(API_URL);
  return res.data;
};

export const addPlayer = async (player: { name: string; active?: boolean }): Promise<Player> => {
  const res = await axios.post(API_URL, player);
  return res.data;
};
