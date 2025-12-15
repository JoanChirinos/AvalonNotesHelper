import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BiCheck, BiSolidWrench, BiX } from "react-icons/bi";
import AvalonNav from "./AvalonNav";
import AvalonTimer from "./AvalonTimer";

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

const DEBUG = false;

export default function AvalonGame() {
  const { game_id } = useParams();

  // const { theme, toggleTheme, notTheme } = useTheme();

  const [players, setPlayers] = useState<Player[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  // Roles state (single-instance role names and duplicate-role counts)
  const [gameRoles, setGameRoles] = useState<string[]>([]);
  // Map of role value -> { evil, label }
  const [roleMap, setRoleMap] = useState<Record<string, { evil: boolean; label?: string }>>({});

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

  // Fetch game roles and counts
  const fetchGameRoles = async () => {
    if (!game_id) return;
    try {
      const res = await fetch(`/api/avalon/game/${game_id}/roles`);
      if (!res.ok) return;
      const data = await res.json();
      const roles = (data.roles || []).filter((r: string) => r !== 'LOYAL_SERVANT' && r !== 'MINION');
      setGameRoles(roles);

      // Also fetch role metadata (evil flag + label) so we can render good/evil styling
      try {
        const metaRes = await fetch('/api/avalon/roles');
        if (metaRes.ok) {
          const meta = await metaRes.json();
          const map: Record<string, { evil: boolean; label?: string }> = {};
          (meta.roles || []).forEach((r: any) => {
            map[r.value] = { evil: !!r.evil, label: r.label || r.value };
          });
          setRoleMap(map);
        }
      } catch (err) {
        console.error('Failed to fetch role metadata', err);
      }
    } catch (err) {
      console.error('Failed to fetch game roles', err);
    }
  };

  useEffect(() => {
    fetchGameRoles();
    fetchQuests();
    const interval = setInterval(fetchQuests, 500);
    return () => clearInterval(interval);
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

  // Debug functions
  const attemptArchival = async () => {
    if (!game_id) return;
    const res = await fetch(`/api/avalon/game/${game_id}/attempt_archival`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (data.redirect) {
      window.location.href = data.redirect;
    }
  };

  const forceArchive = async () => {
    if (!game_id) return;
    const res = await fetch(`/api/avalon/game/${game_id}/force_archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (data.redirect) {
      window.location.href = data.redirect;
    }
  };


  // Timer state for AvalonTimer
  const [timerDefault, setTimerDefault] = useState<number>(120); // 2 minutes in seconds

  async function handleRandomizeTeam(): Promise<void> {
    if (!currentRound || !game_id) return;
    const count = Number((document.querySelector('#random-team-count') as HTMLInputElement)?.value) || 2

    const playerIds = currentRound.roundPlayers.map(rp => rp.playerId);
    // Always include the king
    const kingId = currentRound.king
    const otherPlayerIds = playerIds.filter(id => id !== kingId);

    // Shuffle other players using Fisher-Yates algorithm
    const shuffled = [...otherPlayerIds];
    console.log(shuffled);
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    console.log(shuffled);

    // Pick the first `count - 1` as the team (since king is always included)
    const teamIds = new Set([kingId, ...shuffled.slice(0, Math.max(0, count - 1))]);
    // For each player, set their team status accordingly
    for (const playerId of playerIds) {
      const shouldBeOnTeam = teamIds.has(playerId);
      const currentStatus = currentRound.roundPlayers.find(rp => rp.playerId === playerId)?.team;
      if (currentStatus !== shouldBeOnTeam) {
        await fetch(`/api/avalon/game/${game_id}/toggle_team_player`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ player_id: playerId, round_id: currentRound.id })
        });
      }
    }
    fetchQuests();
  }

  function handleRandomizeKing(): void {
    if (!currentRound || !game_id) return;
    const playerIds = currentRound.roundPlayers.map(rp => rp.playerId);
    const randomIdx = Math.floor(Math.random() * playerIds.length);
    const randomKingId = playerIds[randomIdx];
    handleKingChange(randomKingId);
  }

  type EzApprovalOptions = { all?: boolean; includeSagar?: boolean };
  
  function handleEzApprovals(options?: EzApprovalOptions): React.MouseEventHandler<HTMLButtonElement> {
    return async (e) => {
      e.preventDefault();
      if (!currentRound || !game_id) return;
  
      const all = options?.all;
      const includeSagar = options?.includeSagar;
  
      // Find Sagar (player named "Sagar"), if needed
      let sagarId: number | undefined;
      if (includeSagar) {
        const sagar = players.find(p => p.name.toLowerCase() === "sagar b");
        sagarId = sagar?.id;
      }
  
      // Set approval for all players if "all" is true
      for (const rp of currentRound.roundPlayers) {
        let shouldApprove = false;
        if (all) {
          shouldApprove = true;
        } else {
          const isTeam = rp.team;
          const isSagar = (includeSagar ?? false) && rp.playerId === sagarId;
          shouldApprove = isTeam || isSagar;
        }
        if (rp.approval !== shouldApprove) {
          await fetch(`/api/avalon/game/${game_id}/toggle_votes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ player_id: rp.playerId, round_id: currentRound.id })
          });
        }
      }
      fetchQuests();
    };
  }
  
  return (
    <>
      <div className="modal fade" id="roundToolsModal" tabIndex={-1} aria-labelledby="roundToolsModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="roundToolsModalLabel">Tools</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <div className="vstack gap-2">
                <div className="hstack gap-2 justify-content-end border-bottom pb-2">
                  <button className="btn btn-secondary" data-bs-dismiss="modal" onClick={() => handleRandomizeKing()}>Randomize King</button>
                </div>
                <div className="hstack gap-2 align-items-center justify-content-end border-bottom pb-2">
                  <label htmlFor="random-team-count" className="ma-auto">Team Size</label>
                  <input type="number" className="form-control" style={{maxWidth: '100px'}} min={2} max={currentRound?.roundPlayers.length ?? 2} defaultValue={2} id="random-team-count" />
                  <button className="btn btn-secondary" data-bs-dismiss="modal" onClick={() => handleRandomizeTeam()}>Randomize Team</button>
                </div>
                <div className="hstack gap-2 justify-content-end">
                  <label htmlFor="vote-tools" className="ma-auto">EZ Approvals</label>
                  <div id="vote-tools">
                    <button className="btn btn-success ms-2" data-bs-dismiss="modal" onClick={handleEzApprovals()}>Team</button>
                    <button className="btn btn-success ms-2" data-bs-dismiss="modal" onClick={handleEzApprovals({ includeSagar: true })}>Team + Sagar</button>
                    <button className="btn btn-success ms-2" data-bs-dismiss="modal" onClick={handleEzApprovals({ all: true })}>All</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <AvalonNav
        useModal={true}
        showDebugButtons={DEBUG}
        onForceArchive={forceArchive}
        onAttemptArchival={attemptArchival}
        onAgain={handleNewGameSamePlayers}
        onToggleDetailedView={() => setDetailedView(!detailedView)}
        detailedView={detailedView}
        showDarkModeToggle={true}
      />

      <AvalonTimer
        timerDefault={timerDefault}
        setTimerDefault={setTimerDefault}
        autoRestartKey={currentRound?.id}
      />

      <main className="container-fluid mt-3" style={{ maxWidth: "90%" }}>
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
                  .filter((round, _arr) => {
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
        <div className="card mb-3">
          <div className="card-body py-2">
            {/* Roles: split into Good (green) and Evil (red) with a vertical rule between */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Good roles */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {gameRoles
                  .filter(r => !(roleMap[r]?.evil))
                  .map(r => (
                    <span key={r} className="badge bg-success" style={{ fontSize: '0.8rem' }}>
                      {roleMap[r]?.label ?? r}
                    </span>
                  ))}
              </div>

              {/* vertical rule */}
              <div style={{ width: '1px', background: '#dee2e6', height: '22px' }} />

              {/* Evil roles */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {gameRoles
                  .filter(r => !!roleMap[r]?.evil)
                  .map(r => (
                    <span key={r} className="badge bg-danger" style={{ fontSize: '0.8rem' }}>
                      {roleMap[r]?.label ?? r}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </div>
        <div className="card mb-3 shadow-sm">
          <div className="card-header">
            <div className="d-flex justify-content-between align-items-center">
              <div className="hstack gap-3">
                <h5 className="mb-0">Current Round</h5>
                <div className="vr"></div>
                <button className="btn btn-warning" data-bs-toggle="modal" data-bs-target="#roundToolsModal">
                  <BiSolidWrench size={20} />
                </button>
              </div>
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
                  className={`card me-2 mb-2 selectable-card ${p.id === currentRound?.king ? "bg-info text-dark" : ""}`}
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
