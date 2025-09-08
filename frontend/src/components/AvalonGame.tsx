import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import "./Components.css";

interface RoundPlayer {
  id: number;
  playerId: number;
  roundId: number;
  team: boolean;
  approval: boolean;
}

interface Round {
  id: number;
  questId: number;
  king: number;
  fails: number;
  roundPlayers: RoundPlayer[];
}

interface Quest {
  id: number;
  gameId: string;
  rounds: Round[];
}

interface Player {
  id: number;
  name: string;
  active: boolean;
}

export default function AvalonGame() {
  const { game_id } = useParams();

  const [players, setPlayers] = useState<Player[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);

  // Fetch players once when component mounts
  useEffect(() => {
    fetch(`/api/avalon/game/${game_id}/players`)
      .then(res => res.json())
      .then(data => {
        setPlayers(data.players.map((p: any) => p.player) || []);
      });
  }, [game_id]);

  // Fetch quests and set current round
  const fetchQuests = () => {
    fetch(`/api/avalon/game/${game_id}/quests`)
      .then(res => res.json())
      .then(data => {
        setQuests(data.quests || []);
        if (!data.quests || data.quests.length === 0) {
          setCurrentRound(null);
          return;
        }
        if (currentRound === null) {
          // Set to last round of last quest
          const latestRound = data.quests.at(-1)?.rounds?.at(-1) ?? null;
          setCurrentRound(latestRound);
        } else {
          // Find the round with the same id as currentRound
          let foundRound = null;
          for (const quest of data.quests) {
            foundRound = quest.rounds.find((r: Round) => r.id === currentRound.id);
            if (foundRound) break;
          }
          setCurrentRound(foundRound ?? null);
        }
      });
  };

  useEffect(() => {
    fetchQuests();
    const interval = setInterval(fetchQuests, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game_id]);

  // Change king handler
  const handleKingChange = async (playerId: number) => {
    if (!currentRound || !game_id) return;
    // Optimistically update UI
    setCurrentRound({ ...currentRound, king: playerId });
    await fetch(`/api/avalon/game/${game_id}/set_king`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ king: playerId, round_id: currentRound.id })
    });
  };
  
  // // State for proposed team selection
  // const [proposedTeam, setProposedTeam] = useState<number[]>([]);

  // // Handler for toggling a player in the proposed team
  // const handleTeamToggle = (playerId: number) => {
  //   setProposedTeam(prev =>
  //     prev.includes(playerId)
  //       ? prev.filter(id => id !== playerId)
  //       : [...prev, playerId]
  //   );
  // };

  const handleTeamToggle = async (playerId: number) => {
    await fetch(`/api/avalon/game/${game_id}/toggle_team_player`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId, round_id: currentRound?.id })
    }).then(() => {fetchQuests();}) ;
  }

  return (
    <>
      <nav className="navbar navbar-expand-md navbar-dark bg-dark">
        <div className="container-fluid d-flex justify-content-between">
          <Link className="navbar-brand" to="/avalon">Avalon Notes Helper</Link>
        </div>
      </nav>
      <main className="container mt-3">
        {quests.map(quest => (
          <div key={quest.id} className="card mb-3 shadow-sm">
            <div className="card-header">
              <h5 className="mb-0">
                Quest {quests.findIndex(q => q.id === quest.id) + 1}
              </h5>
            </div>
            <div className="card-body">
              {quest.rounds
                .filter((round, idx, arr) => {
                  // Exclude last round of last quest
                  const isLastQuest = quest === quests.at(-1);
                  const isLastRound = round === arr.at(-1);
                  return !(isLastQuest && isLastRound);
                })
                .map(round => (
                  <div key={round.id} className="mb-2">
                    <h6>
                      Round {quest.rounds.findIndex(r => r.id === round.id) + 1} (King: Player {round.king})
                    </h6>
                    <p>Fails: {round.fails}</p>
                    <ul>
                      {round.roundPlayers.map(rp => (
                        <li key={rp.id}>
                          Player {rp.playerId} - Team: {rp.team ? "Yes" : "No"}, Approval: {rp.approval ? "Approved" : "Rejected"}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          </div>
        ))}
        <div className="card mb-3 shadow-sm">
          <div className="card-header">
            <h5 className="mb-0">Current Round</h5>
          </div>
          <div className="card-body">
            <div className="mb-2"><strong>King</strong></div>
            <div className="d-flex flex-wrap">
              {players.map(p => (
                <div
                  className={`card me-2 mb-2 selectable-card ${p.id === currentRound?.king ? "bg-info" : ""}`}
                  key={p.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => handleKingChange(p.id)}
                >
                  {p.name}
                </div>
              ))}
            </div>
            <div className="mb-2"><strong>Proposed Team</strong></div>
            <div className="d-flex flex-wrap mb-2">
              {players.map(p => (
                <div
                  className={`card me-2 mb-2 selectable-card ${currentRound?.roundPlayers.some(rp => rp.playerId === p.id) ? "bg-success text-white" : ""}`}
                  key={p.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => handleTeamToggle(p.id)}
                >
                  {p.name}
                </div>
              ))}
            </div>
            <div className="mb-2"><strong>Team Votes</strong></div>
            <div className="mb-2"><strong>Quest Votes</strong></div>
          </div>
        </div>
      </main>
    </>
  );
}
