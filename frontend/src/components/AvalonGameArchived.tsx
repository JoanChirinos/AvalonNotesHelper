import React, { useEffect, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";

import { BiCheck, BiX } from "react-icons/bi";

import { useTheme } from "../ThemeContext";
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

export default function AvalonGameArchived() {
  const { game_id } = useParams();

  const { theme, toggleTheme, notTheme } = useTheme();

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

  const handleNewGameSamePlayers = async () => {
    const res = await fetch("/api/avalon/new_game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const newGameId = (await res.json()).game?.id;
    if (newGameId) {
      // Add all current players to new game
      for (const player of players) {
        await fetch(`/api/avalon/game/${newGameId}/players`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ player_id: player.id }),
        });
      }
      // Redirect to new game
      window.location.href = `/avalon/game/${newGameId}`;
    } else {
      alert("Failed to create new game.");
    }
  };

  return (
    <>
      <nav className="navbar navbar-expand-md border-bottom">
        <div className="container-fluid d-flex justify-content-between">
          <Link className="navbar-brand" to="/avalon">Avalon Notes Helper</Link>
          <div className="d-flex align-items-center gap-3">
            <button className={`btn btn-outline-${notTheme()}`} onClick={() => handleNewGameSamePlayers()}>
              Again!
            </button>
            <button className={`btn btn-outline-${notTheme()}`} onClick={() => setDetailedView(!detailedView)}>
              {detailedView ? "Hide Non-terminal Rounds" : "Show Non-terminal Rounds"}
            </button>
          <button className={`btn btn-outline-${notTheme()}`} onClick={toggleTheme}>
            {theme === "light" ? "Dark Mode" : "Light Mode"}
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
                    // Exclude all but last rounds if not in detailed view
                    return detailedView || round === quest.rounds.at(-1);
                  })
                  .map(round => {
                    return (
                      <div
                        key={round.id}
                        className="card mb-2 d-flex"
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
                            {Array.from({ length: round.fails }).map((_, i) => (
                              <BiX key={i} style={{ color: "white", fontSize: "2rem" }} />
                            ))}
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
                                    <span style={{ color: 'green', fontWeight: 'bold', fontSize: '1.2rem' }}><BiCheck /></span>
                                  ) : (
                                    <span style={{ color: 'red', fontWeight: 'bold', fontSize: '1.2rem' }}><BiX /></span>
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
                                    <span style={{ color: 'green', fontWeight: 'bold', fontSize: '1.2rem' }}><BiCheck /></span>
                                  ) : (
                                    <span style={{ color: 'red', fontWeight: 'bold', fontSize: '1.2rem' }}><BiX /></span>
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
      </main>
    </>
  );
}
