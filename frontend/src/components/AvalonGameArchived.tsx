import { useEffect, useState } from "react";
import AvalonTimer from "./AvalonTimer";
import { useParams } from "react-router-dom";

import { BiCheck, BiX } from "react-icons/bi";

import "./Components.css";
import AvalonNav from "./AvalonNav";

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

  const [players, setPlayers] = useState<Player[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  // Timer state for AvalonTimer
  const [timerDefault, setTimerDefault] = useState<number>(120); // 2 minutes in seconds

  const [detailedView, setDetailedView] = useState<boolean>(true);
  // Role metadata and assignments (for post-game role assignment)
  const [roleMap, setRoleMap] = useState<Record<string, { evil: boolean; label?: string }>>({});
  const [assignments, setAssignments] = useState<Array<{ gamePlayerId: number; playerId: number; playerName: string | null; roleName: string | null }>>([]);
  const [availableGameRoles, setAvailableGameRoles] = useState<string[]>([]);
  const [loyalServantCount, setLoyalServantCount] = useState<number>(0);
  const [minionCount, setMinionCount] = useState<number>(0);

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

  // Fetch available role metadata (displayName + evil)
  const fetchRoleMetadata = async () => {
    try {
      const res = await fetch('/api/avalon/roles');
      if (!res.ok) return;
      const data = await res.json();
      const map: Record<string, { evil: boolean; label?: string }> = {};
      (data.roles || []).forEach((r: any) => {
        map[r.value] = { evil: !!r.evil, label: r.label || r.value };
      });
      setRoleMap(map);
    } catch (err) {
      console.error('Failed to fetch role metadata', err);
    }
  };

  // Fetch roles that were selected for this game (so dropdown only shows roles present in the game)
  const fetchGameRoles = async () => {
    if (!game_id) return;
    try {
      const res = await fetch(`/api/avalon/game/${game_id}/roles`);
      if (!res.ok) return;
      const data = await res.json();
      const roles: string[] = (data.roles || []).filter((r: string) => r !== 'LOYAL_SERVANT' && r !== 'MINION');
      const list = [...roles];
      const lCount = Number(data.loyalServantCount ?? 0);
      const mCount = Number(data.minionCount ?? 0);
      setLoyalServantCount(lCount);
      setMinionCount(mCount);
      if (lCount > 0) list.push('LOYAL_SERVANT');
      if (mCount > 0) list.push('MINION');
      setAvailableGameRoles(list);
    } catch (err) {
      console.error('Failed to fetch game roles', err);
    }
  };

  // Fetch current assignments for this game
  const fetchAssignments = async () => {
    if (!game_id) return;
    try {
      const res = await fetch(`/api/avalon/game/${game_id}/assignments`);
      if (!res.ok) return;
      const data = await res.json();
      setAssignments(data.assignments || []);
    } catch (err) {
      console.error('Failed to fetch assignments', err);
    }
  };

  useEffect(() => {
    fetchRoleMetadata();
    fetchAssignments();
    fetchGameRoles();
    const intervalA = setInterval(() => {
      fetchAssignments();
      fetchGameRoles();
    }, 1000);
    return () => clearInterval(intervalA);
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

  // Assign/unassign a role to a gamePlayer (live updates)
  const assignRole = async (gamePlayerId: number, roleName: string | null) => {
    if (!game_id) return;
    try {
      const res = await fetch(`/api/avalon/game/${game_id}/assign_role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gamePlayerId, roleName }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to assign role');
        return;
      }
      await fetchAssignments();
    } catch (err) {
      console.error('assignRole error', err);
      alert('Failed to assign role');
    }
  };

  return (
    <>
      <AvalonTimer
        timerDefault={timerDefault}
        setTimerDefault={setTimerDefault}
        autoRestartKey={currentRound?.id}
      />
      <AvalonNav
        useModal={true}
        onAgain={handleNewGameSamePlayers}
        onToggleDetailedView={() => setDetailedView(!detailedView)}
        detailedView={detailedView}
        showDarkModeToggle={true}
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

        <div className="card mb-3">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Role Assignment</h5>
            <span className="badge bg-secondary">{assignments.length} Players</span>
          </div>
          <div className="card-body">
            {assignments.length === 0 ? (
              <div className="text-muted">No assignments yet.</div>
            ) : (
              (() => {
                // Build ordered role slots: good single-instance, loyal servants, evil single-instance, minions
                const singleGood = availableGameRoles.filter(r => r !== 'LOYAL_SERVANT' && r !== 'MINION' && !roleMap[r]?.evil);
                const singleEvil = availableGameRoles.filter(r => r !== 'LOYAL_SERVANT' && r !== 'MINION' && !!roleMap[r]?.evil);
                const slots: Array<{ key: string; roleName: string; label: string; evil: boolean } > = [];
                singleGood.forEach(r => slots.push({ key: r, roleName: r, label: roleMap[r]?.label ?? r, evil: !!roleMap[r]?.evil }));
                for (let i = 0; i < loyalServantCount; i++) {
                  slots.push({ key: `LOYAL_SERVANT_${i}`, roleName: 'LOYAL_SERVANT', label: roleMap['LOYAL_SERVANT']?.label ?? 'Loyal Servant', evil: !!roleMap['LOYAL_SERVANT']?.evil });
                }
                singleEvil.forEach(r => slots.push({ key: r, roleName: r, label: roleMap[r]?.label ?? r, evil: !!roleMap[r]?.evil }));
                for (let i = 0; i < minionCount; i++) {
                  slots.push({ key: `MINION_${i}`, roleName: 'MINION', label: roleMap['MINION']?.label ?? 'Minion', evil: !!roleMap['MINION']?.evil });
                }

                // Map current assignments to slot selections (prefer matches in order)
                const usedGamePlayerIds = new Set<number>();
                const slotSelected: Array<number | null> = slots.map(s => {
                  const found = assignments.find(a => a.roleName === s.roleName && !usedGamePlayerIds.has(a.gamePlayerId));
                  if (found) {
                    usedGamePlayerIds.add(found.gamePlayerId);
                    return found.gamePlayerId;
                  }
                  return null;
                });

                return (
                  <div className="d-flex flex-column">
                    {slots.map((slot, idx) => (
                      <div key={slot.key} className="d-flex align-items-center justify-content-center mb-2">
                        <span className={`badge mx-e ${slot.evil ? 'bg-danger' : 'bg-success'}`} style={{ minWidth: '180px' }}>{slot.label}</span>
                        <select
                          className="form-select form-select-sm mx-2"
                          value={slotSelected[idx] ?? ''}
                          onChange={async (e) => {
                            const val = e.target.value === '' ? null : Number(e.target.value);
                            const prev = slotSelected[idx];
                            try {
                              if (val === null) {
                                // unassign whoever was in this slot
                                if (prev) await assignRole(prev, null);
                                slotSelected[idx] = null;
                                return;
                              }

                              // If this slot had a previous player, unassign them (unless it's the same as selected)
                              if (prev && prev !== val) {
                                await assignRole(prev, null);
                              }

                              // Now assign the selected player to this slot's role
                              await assignRole(val, slot.roleName);
                              slotSelected[idx] = val;
                            } catch (err) {
                              console.error('slot assignment error', err);
                            }
                          }}
                        >
                          <option value="">-- Unassigned --</option>
                          {assignments
                            .filter(a => a.roleName === null || a.gamePlayerId === slotSelected[idx])
                            .map(a => (
                              <option
                                key={a.gamePlayerId}
                                value={a.gamePlayerId}
                              >
                                {a.playerName ?? `Player ${a.playerId}`}
                              </option>
                            ))}
                        </select>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </div>
        </div>

      </main>
    </>
  );
}
