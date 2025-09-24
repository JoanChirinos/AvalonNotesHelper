import React, { useEffect, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";

import { BiCheck, BiChevronUp, BiChevronDown, BiPlayCircle, BiPauseCircle, BiRevision, BiSolidGrid, BiX } from "react-icons/bi";

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

const DEBUG = false;

export default function AvalonGame() {
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

  // Timer state and logic
  const TIMER_DEFAULT = 180; // 3 minutes in seconds
  const [timer, setTimer] = useState<number>(TIMER_DEFAULT);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [timerPos, setTimerPos] = useState<{ x: number; y: number }>({ x: window.innerWidth - 255, y: 65 });
  const [dragging, setDragging] = useState<boolean>(false);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const timerRef = useRef<HTMLDivElement>(null);

  // For chevron controls
  const handleAddMinute = () => setTimer(t => t + 60);
  const handleSubtractMinute = () => setTimer(t => (t >= 60 ? t - 60 : 0));

  // Play a sine wave beep when timer reaches 0
  const playBeep = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    oscillator.connect(ctx.destination);
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      ctx.close();
    }, 2000);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => {
          if (prev === 1) playBeep();
          return prev > 0 ? prev - 1 : 0;
        });
      }, 1000);
    } else if (!timerActive && interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timer]);

  const handleTimerStart = () => {
    if (timer === 0) setTimer(TIMER_DEFAULT);
    setTimerActive(true);
  };
  const handleTimerStop = () => setTimerActive(false);
  const handleTimerReset = () => {
    setTimerActive(false);
    setTimer(TIMER_DEFAULT);
  };
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(1, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    setDragging(true);
    const rect = timerRef.current?.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0)
    };
  };

  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      setTimerPos({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y
      });
    };
    const handleMouseUp = () => {
      setDragging(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  return (
    <>
      <nav className="navbar navbar-expand-md border-bottom">
        <div className="container-fluid d-flex justify-content-between">
          <Link className="navbar-brand" to="/avalon">Avalon Notes Helper</Link>
          <div className="d-flex align-items-center gap-3">
            {DEBUG && (
              <button className={`btn btn-outline-${notTheme()}`} onClick={() => attemptArchival()}>Archive</button>
            )}
            {/* TODO: This should actually go back to setup (remove quests?) though that's non-trivial so this is easier for now */}
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

      {/* Draggable Timer */}
      <div
        ref={timerRef}
        style={{
          position: "fixed",
          left: timerPos.x,
          top: timerPos.y,
          zIndex: 9999,
          cursor: dragging ? "grabbing" : "grab",
          userSelect: "none",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          background: "#222",
          borderRadius: "8px",
          padding: "8px 12px"
        }}
        onMouseDown={handleDragStart}
      >
        <div className="d-flex align-items-center">
          <button className="btn btn-outline-light border-0 px-0 disabled">
            <BiSolidGrid size={18} />
          </button>
          <div className="d-flex align-items-center me-2">
            <div className="d-flex flex-column align-items-center justify-content-center me-2">
              <div className="d-flex flex-column justify-content-center" style={{ height: '32px' }}>
                <button className="btn btn-outline-secondary btn-sm p-0 border-0" style={{ height: '16px', width: '28px', minWidth: '28px', lineHeight: 1 }} onClick={handleAddMinute} aria-label="Add minute">
                  <BiChevronUp size={14} color="currentColor" />
                </button>
                <button className="btn btn-outline-secondary btn-sm p-0 border-0" style={{ height: '16px', width: '28px', minWidth: '28px', lineHeight: 1 }} onClick={handleSubtractMinute} aria-label="Subtract minute">
                  <BiChevronDown size={14} color="currentColor" />
                </button>
              </div>
            </div>
            <span className="btn btn-outline-secondary text-light btn" style={{ pointerEvents: "none" }}>{formatTimer(timer)}</span>
          </div>
          <button className="btn btn-outline-light btn-sm border-0" onClick={handleTimerStart} disabled={timerActive && timer > 0}>
            <BiPlayCircle size={18} />
          </button>
          <button className="btn btn-outline-light btn-sm border-0" onClick={handleTimerStop} disabled={!timerActive}>
            <BiPauseCircle size={18} />
          </button>
          <button className="btn btn-outline-light btn-sm border-0" onClick={handleTimerReset}>
            <BiRevision size={18} />
          </button>
        </div>
      </div>


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
        <div className="card mb-3 shadow-sm">
          <div className="card-header">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Current Round</h5>
              <button className="btn btn-success" onClick={() => { handleSubmitRound(); handleTimerReset(); }} disabled={!currentRound}>
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
