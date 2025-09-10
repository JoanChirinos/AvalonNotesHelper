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

  const [detailedView, setDetailedView] = useState<boolean>(true);

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
        let latestRound: Round | null;
        if (currentRound === null) {
          // Set to last round of last quest
          latestRound = data.quests.at(-1)?.rounds?.at(-1) ?? null;
        } else {
          // Find the round with the same id as currentRound
          let foundRound = null;
          for (const quest of data.quests) {
            foundRound = quest.rounds.find((r: Round) => r.id === currentRound.id);
            if (foundRound) break;
          }
          latestRound = foundRound ?? null;
        }
        // Check failures vs proposed team size
        if (latestRound) {
          const teamCount = latestRound.roundPlayers.filter(rp => rp.team).length;
          if (latestRound.fails > teamCount) {
            latestRound = { ...latestRound, fails: 0 };
            // Update backend as well
            fetch(`/api/avalon/game/${game_id}/submit_failures`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ count: 0, round_id: latestRound.id })
            });
          }
        }

        setCurrentRound(latestRound);
      });
  };

  useEffect(() => {
    fetchQuests();
    const interval = setInterval(fetchQuests, 500);
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

  const handleTeamToggle = async (playerId: number) => {
    await fetch(`/api/avalon/game/${game_id}/toggle_team_player`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId, round_id: currentRound?.id })
    });
    fetchQuests();
  }

  const handleVotesToggle = async (playerId: number) => {
    await fetch(`/api/avalon/game/${game_id}/toggle_votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId, round_id: currentRound?.id })
    });
    fetchQuests();
  }

  const handleQuestFailures = async (count: number) => {
    await fetch(`/api/avalon/game/${game_id}/submit_failures`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: count, round_id: currentRound?.id })
    });
    fetchQuests();
  }

  const handleSubmitRound = async () => {
    if (!currentRound) return;
    await fetch(`/api/avalon/game/${game_id}/submit_round`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ round_id: currentRound.id })
    });
    // Immediately refresh quests and update state
    fetchQuests();
  };

  return (
    <>
      <nav className="navbar navbar-expand-md navbar-dark bg-dark">
        <div className="container-fluid d-flex justify-content-between">
          <Link className="navbar-brand" to="/avalon">Avalon Notes Helper</Link>
          <div>
            <button className="btn btn-outline-light" onClick={() => setDetailedView(!detailedView)}>
              {detailedView ? "Hide Non-terminal Rounds" : "Show Non-terminal Rounds"}
            </button>
          </div>
        </div>
      </nav>
      <main className="container-fluid mt-3" style={{ maxWidth: "80%" }}>
        <div className="d-flex flex-wrap justify-content-around">
          {quests.map(quest => (
            <div key={quest.id} className="card mb-3 shadow-sm mx-2" style={{ width: "auto", flex: "0 1 auto" }}>
              <div className="card-header d-flex flex-row justify-content-between align-items-center">
                <h5 className="mb-0">
                  Quest {quests.findIndex(q => q.id === quest.id) + 1}
                </h5>
              </div>
              <div className="card-body">
                {quest.rounds
                  .filter((round, idx, arr) => {
                    // If last quest, include second to last round if exists
                    const isLastQuest = quest === quests.at(-1);
                    const isSecondToLastRound = isLastQuest && quest.rounds.length > 1 && round === quest.rounds.at(-2);
                    if (isSecondToLastRound) return true;

                    // Exclude all but last rounds if not in detailed view
                    return detailedView || round === quest.rounds.at(-1);
                  })
                  .map(round => {
                    const lastQuest = quests.at(-1);
                    const lastQuestRounds = lastQuest?.rounds;
                    const isLastQuestLastRoundWithMultipleRounds = lastQuestRounds && round === lastQuestRounds.at(-1) && lastQuestRounds.length > 1;
                    const isLastQuestLastRound = lastQuestRounds && round === lastQuestRounds.at(-1);
                    return (
                      <div
                        key={round.id}
                        className={`card mb-2 d-flex ${isLastQuestLastRoundWithMultipleRounds ? "d-none" : ""}`}
                        style={isLastQuestLastRound ? { visibility: "hidden" } : {}}
                      >
                        <div
                          className={`card-header d-flex justify-content-between align-items-center ${
                            (() => {
                              const totalPlayers = round.roundPlayers.length;
                              const approvedVotes = round.roundPlayers.filter(rp => rp.approval).length;
                              if (approvedVotes > Math.floor(totalPlayers / 2)) {
                                return round.fails === 0 ? "bg-success text-white" : "bg-danger text-white";
                              }
                              return "";
                            })()
                          }`}
                        >
                          <div>
                            Round {quest.rounds.findIndex(r => r.id === round.id) + 1}
                          </div>
                          <div>
                            Fails: {round.fails}
                          </div>
                        </div>
                      <div className="card-body d-flex flex-row justify-content-center flex-wrap">
                        <div className="card d-inline-flex flex-row flex-wrap" style={{ width: "auto" }}>
                          {round.roundPlayers.filter(rp => rp.team).map(rp => {
                            const player = players.find(p => p.id === rp.playerId);
                            return (
                              <div className="me-2 mb-2 d-flex flex-column align-items-center justify-content-center" key={rp.playerId}>
                                <div className="mx-2 my-1 d-flex align-items-center">
                                  {player ? (
                                    round.king === rp.playerId ? (
                                      <span className="badge bg-warning text-dark" style={{ fontSize: "1rem", fontWeight: "normal" }}>
                                        {player.name}
                                      </span>
                                    ) : (
                                      player.name
                                    )
                                  ) : (
                                    round.king === rp.playerId ? (
                                      <span className="badge bg-warning text-dark" style={{ fontSize: "1rem", fontWeight: "normal" }}>
                                        {`Player ${rp.playerId}`}
                                      </span>
                                    ) : (
                                      `Player ${rp.playerId}`
                                    )
                                  )}
                                </div>
                                <div>
                                  {rp.approval ? (
                                    <span style={{ color: 'green', fontWeight: 'bold' }}>&#10003;</span>
                                  ) : (
                                    <span style={{ color: 'red', fontWeight: 'bold' }}>&#10007;</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="d-inline-flex flex-row flex-wrap" style={{ width: "auto" }}>
                          {round.roundPlayers.filter(rp => !rp.team).map(rp => {
                            const player = players.find(p => p.id === rp.playerId);
                            return (
                              <div className="me-2 mb-2 d-flex flex-column align-items-center justify-content-center" key={rp.playerId}>
                                <div className="mx-2 my-1 d-flex align-items-center">
                                  {player ? (
                                    round.king === rp.playerId ? (
                                      <span className="badge bg-warning text-dark" style={{ fontSize: "1rem", fontWeight: "normal" }}>
                                        {player.name}
                                      </span>
                                    ) : (
                                      player.name
                                    )
                                  ) : (
                                    round.king === rp.playerId ? (
                                      <span className="badge bg-warning text-dark" style={{ fontSize: "1rem", fontWeight: "normal" }}>
                                        {`Player ${rp.playerId}`}
                                      </span>
                                    ) : (
                                      `Player ${rp.playerId}`
                                    )
                                  )}
                                </div>
                                <div>
                                  {rp.approval ? (
                                    <span style={{ color: 'green', fontWeight: 'bold' }}>&#10003;</span>
                                  ) : (
                                    <span style={{ color: 'red', fontWeight: 'bold' }}>&#10007;</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );})}
              </div>
            </div>
          ))}
        </div>
        <div className="card mb-3 shadow-sm">
          <div className="card-header">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Current Round</h5>
              <button className="btn btn-success" onClick={handleSubmitRound} disabled={!currentRound}>
                Submit
              </button>
            </div>
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
                  className={`card me-2 mb-2 selectable-card ${currentRound?.roundPlayers.some(rp => rp.playerId === p.id && rp.team) ? "bg-success text-white" : ""}`}
                  key={p.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => handleTeamToggle(p.id)}
                >
                  {p.name}
                </div>
              ))}
            </div>
            <div className="mb-2"><strong>Votes</strong></div>
            <div className="d-flex flex-wrap mb-2">
              {players.map(p => (
                <div
                  className={`card me-2 mb-2 selectable-card ${currentRound?.roundPlayers.some(rp => rp.playerId === p.id && rp.approval) ? "bg-success text-white" : ""}`}
                  key={p.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => handleVotesToggle(p.id)}
                >
                  {p.name}
                </div>
              ))}
            </div>
            <div className="mb-2"><strong>Failures</strong></div>
            <div className="d-flex flex-wrap mb-2">
                {currentRound &&
                (() => {
                  const totalPlayers = currentRound.roundPlayers.length;
                  const approvedVotes = currentRound.roundPlayers.filter(rp => rp.approval).length;
                  if (approvedVotes > Math.floor(totalPlayers / 2)) {
                    return Array.from({ length: currentRound.roundPlayers.filter(rp => rp.team).length + 1 }, (_, idx) => (
                      <div
                        className={`card me-2 mb-2 selectable-card ${currentRound.fails === idx ? "bg-danger text-white" : ""}`}
                        key={idx}
                        onClick={() => handleQuestFailures(idx)}
                      >
                        {idx}
                      </div>
                    ));
                  }
                  return null;
                })()
                }
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
