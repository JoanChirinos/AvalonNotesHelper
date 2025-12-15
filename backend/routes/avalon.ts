import { Router } from "express";
import type { Request, Response } from "express";
import { PrismaClient, type Quest, type Round, RoleName } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();
const router = Router();

router.get("/roles", async (req: Request, res: Response) => {
  try {
    const roleDefs = await prisma.role.findMany({
      orderBy: { id: "asc" },
      select: { roleName: true, evil: true, displayName: true }
    });
    const roles = roleDefs.map(d => ({
      value: d.roleName,
      label: d.displayName,
      evil: d.evil,
    }));
    res.json({ roles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
});

// POST /api/avalon/new_game - create a new game
router.post("/new_game", async (req: Request, res: Response) => {
  try {
    const gameId = uuidv4();
    const startTime = new Date();
    const newGame = await prisma.game.create({
      data: {
        id: gameId,
        start_time: startTime,
        active: true,
      },
    });
    res.json({ game: newGame });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create game" });
  }
});

// GET /api/avalon/landing/games - list all games
router.get("/landing/games", async (req: Request, res: Response) => {
  try {
    const games = await prisma.game.findMany({
      include: {
        players: {
          include: {
            player: true,
          }
        },
        quests: true,
      },
      orderBy: {
        start_time: "desc",
      }
    });
    // Format games for frontend
    const formattedGames = await Promise.all(games.map(async game => ({
      game_id: game.id,
      start_time: game.start_time.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true
      }),
      player_count: game.players.length,
      player_names: game.players.map(gp => gp.player.name).sort(),
      in_setup: game.active && game.quests.length === 0,
      active: game.active,
      good_won: await getGameOutcome(game.id) === 1,
    })));
    res.json({ games: formattedGames });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch games" });
  }
});

router.get("/game/:game_id", async (req: Request, res: Response) => {
  const { game_id } = req.params;
  if (!game_id) {
    return res.status(400).json({ error: "Missing game_id parameter" });
  }
  try {
    const game = await prisma.game.findUnique({
      where: { id: game_id },
      include: { quests: true }
    });
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }
    res.json({ game });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch game" });
  }
});

router.post("/game/:game_id/start", async (req: Request, res: Response) => {
  const { game_id } = req.params;
  if (!game_id) {
    return res.status(400).json({ error: "Missing game_id parameter" });
  }
  try {
    // Get the first player in the game
    const gamePlayers = await prisma.gamePlayer.findMany({
      where: { gameId: game_id },
      orderBy: { id: "asc" },
      include: { player: true }
    });
    let randomPlayerId: number | null = null;
    if (gamePlayers.length > 0) {
      const randomIndex = Math.floor(Math.random() * gamePlayers.length);
      const selectedPlayer = gamePlayers[randomIndex];
      if (selectedPlayer !== undefined && selectedPlayer.playerId !== undefined) {
        randomPlayerId = selectedPlayer.playerId;
      }
    }
    if (!randomPlayerId) {
      return res.status(400).json({ error: "No players in game to set as king" });
    }
    const updatedGame = await prisma.game.update({
      where: {
        id: game_id,
        active: true,
      },
      data: {
        quests: {
          create: {
            rounds: {
              create: {
                king: randomPlayerId,
                roundPlayers: {
                  create: gamePlayers.map(gp => ({
                    playerId: gp.playerId,
                    team: false,
                    approval: false,
                  })),
                },
                fails: 0,
              }
            }
          }
        }
      },
      include: {
        quests: {
          include: {
            rounds: true
          }
        }
      }
    });
    res.json({ game: updatedGame });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to start game" });
  }
});

router.get("/game/:game_id/players", async (req: Request, res: Response) => {
  const { game_id } = req.params;
  if (!game_id) {
    return res.status(400).json({ error: "Missing game_id parameter" });
  }
  try {
    const players = await prisma.gamePlayer.findMany({
      where: { gameId: game_id },
      include: { player: true },
    });
    res.json({ players });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

// GET /api/avalon/game/:game_id/roles - get single-instance roles and duplicate-role counts for a game
router.get("/game/:game_id/roles", async (req: Request, res: Response) => {
  const { game_id } = req.params;
  if (!game_id) {
    return res.status(400).json({ error: "Missing game_id parameter" });
  }
  try {
    const game = await prisma.game.findUnique({
      where: { id: game_id },
      include: { roles: true },
    });
    if (!game) return res.status(404).json({ error: "Game not found" });
    const roles = (game.roles || []).map(r => r.roleName);
    res.json({ roles, loyalServantCount: game.loyalServantCount ?? 0, minionCount: game.minionCount ?? 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch game roles" });
  }
});

// POST /api/avalon/game/:game_id/roles - add a single-instance role to a game
router.post("/game/:game_id/roles", async (req: Request, res: Response) => {
  const { game_id } = req.params;
  const { roleName } = req.body;
  if (!game_id) return res.status(400).json({ error: "Missing game_id parameter" });
  if (!roleName || typeof roleName !== 'string') return res.status(400).json({ error: "Missing or invalid roleName" });
  if (roleName === 'LOYAL_SERVANT' || roleName === 'MINION') {
    return res.status(400).json({ error: "Use set_role_count to change counts for duplicate roles" });
  }
  try {
    // Validate roleName against the RoleName enum
    if (!Object.values(RoleName).includes(roleName as RoleName)) {
      return res.status(400).json({ error: "Invalid roleName" });
    }
    // Resolve the role by enum and connect by id to avoid unsafe casts
    const role = await prisma.role.findUnique({ where: { roleName: roleName as RoleName } });
    if (!role) return res.status(400).json({ error: "Role not found" });
    const updated = await prisma.game.update({
      where: { id: game_id },
      data: { roles: { connect: { id: role.id } } },
      include: { roles: true },
    });
    const roles = (updated.roles || []).map(r => r.roleName);
    res.json({ roles, loyalServantCount: updated.loyalServantCount ?? 0, minionCount: updated.minionCount ?? 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add role to game" });
  }
});

// POST /api/avalon/game/:game_id/remove_role - remove a single-instance role from a game
router.post("/game/:game_id/remove_role", async (req: Request, res: Response) => {
  const { game_id } = req.params;
  const { roleName } = req.body;
  if (!game_id) return res.status(400).json({ error: "Missing game_id parameter" });
  if (!roleName || typeof roleName !== 'string') return res.status(400).json({ error: "Missing or invalid roleName" });
  if (roleName === 'LOYAL_SERVANT' || roleName === 'MINION') {
    return res.status(400).json({ error: "Use set_role_count to change counts for duplicate roles" });
  }
  try {
    // Validate requested roleName
    if (!Object.values(RoleName).includes(roleName as RoleName)) {
      return res.status(400).json({ error: "Invalid roleName" });
    }
    const role = await prisma.role.findUnique({ where: { roleName: roleName as RoleName } });
    if (!role) return res.status(400).json({ error: "Role not found" });
    const updated = await prisma.game.update({
      where: { id: game_id },
      data: { roles: { disconnect: { id: role.id } } },
      include: { roles: true },
    });
    const roles = (updated.roles || []).map(r => r.roleName);
    res.json({ roles, loyalServantCount: updated.loyalServantCount ?? 0, minionCount: updated.minionCount ?? 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove role from game" });
  }
});

// POST /api/avalon/game/:game_id/set_role_count - set count for LOYAL_SERVANT or MINION
router.post("/game/:game_id/set_role_count", async (req: Request, res: Response) => {
  const { game_id } = req.params;
  const { roleName, count } = req.body;
  if (!game_id) return res.status(400).json({ error: "Missing game_id parameter" });
  if (!roleName || (roleName !== 'LOYAL_SERVANT' && roleName !== 'MINION')) return res.status(400).json({ error: "roleName must be LOYAL_SERVANT or MINION" });
  if (typeof count !== 'number' || count < 0) return res.status(400).json({ error: "count must be a non-negative number" });
  try {
    const data: any = {};
    if (roleName === 'LOYAL_SERVANT') data.loyalServantCount = count;
    if (roleName === 'MINION') data.minionCount = count;
    const updated = await prisma.game.update({
      where: { id: game_id },
      data,
      include: { roles: true },
    });
    const roles = (updated.roles || []).map(r => r.roleName);
    res.json({ roles, loyalServantCount: updated.loyalServantCount ?? 0, minionCount: updated.minionCount ?? 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to set role count" });
  }
});

// GET /api/avalon/game/:game_id/assignments - fetch role assignments for players in a game
router.get("/game/:game_id/assignments", async (req: Request, res: Response) => {
  const { game_id } = req.params;
  if (!game_id) return res.status(400).json({ error: "Missing game_id parameter" });
  try {
    const gamePlayers = await prisma.gamePlayer.findMany({
      where: { gameId: game_id },
      include: { player: true, role: true }
    });
    const assignments = gamePlayers.map(gp => ({
      gamePlayerId: gp.id,
      playerId: gp.playerId,
      playerName: gp.player?.name ?? null,
      roleName: gp.role ? gp.role.roleName : null,
    }));
    const game = await prisma.game.findUnique({ where: { id: game_id } });
    res.json({ assignments, loyalServantCount: game?.loyalServantCount ?? 0, minionCount: game?.minionCount ?? 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

// POST /api/avalon/game/:game_id/assign_role - assign or unassign a role to a game player
// body: { gamePlayerId: number, roleName: string | null }
router.post("/game/:game_id/assign_role", async (req: Request, res: Response) => {
  const { game_id } = req.params;
  const { gamePlayerId, roleName } = req.body;
  if (!game_id) return res.status(400).json({ error: "Missing game_id parameter" });
  if (!gamePlayerId || typeof gamePlayerId !== 'number') return res.status(400).json({ error: "Missing or invalid gamePlayerId" });

  try {
    const game = await prisma.game.findUnique({ where: { id: game_id } });
    if (!game) return res.status(404).json({ error: "Game not found" });

    const gp = await prisma.gamePlayer.findUnique({ where: { id: gamePlayerId }, include: { role: true } });
    if (!gp || gp.gameId !== game_id) return res.status(400).json({ error: "Invalid gamePlayerId for this game" });

    // If roleName is null/undefined we interpret as unassign
    if (roleName === null || roleName === undefined) {
      const updated = await prisma.gamePlayer.update({ where: { id: gamePlayerId }, data: { role: { disconnect: true } }, include: { role: true, player: true } });
      // return current assignments
      const gamePlayers = await prisma.gamePlayer.findMany({ where: { gameId: game_id }, include: { player: true, role: true } });
      const assignments = gamePlayers.map(g => ({ gamePlayerId: g.id, playerId: g.playerId, playerName: g.player?.name ?? null, roleName: g.role ? g.role.roleName : null }));
      return res.json({ assignments, updated: { gamePlayerId: updated.id, roleName: null } });
    }

    // Validate roleName string
    if (typeof roleName !== 'string') return res.status(400).json({ error: "roleName must be a string or null" });
    if (!Object.values(RoleName).includes(roleName as RoleName)) return res.status(400).json({ error: "Invalid roleName" });

    const role = await prisma.role.findUnique({ where: { roleName: roleName as RoleName } });
    if (!role) return res.status(400).json({ error: "Role not found" });

    // If role is LOYAL_SERVANT or MINION allow multiple but enforce game counts
    if (role.roleName === 'LOYAL_SERVANT' || role.roleName === 'MINION') {
      const maxCount = role.roleName === 'LOYAL_SERVANT' ? (game.loyalServantCount ?? 0) : (game.minionCount ?? 0);
      // Count current assignments of this role in the game (excluding this gp if already assigned)
      const currentCount = await prisma.gamePlayer.count({ where: { gameId: game_id, roleId: role.id } });
      const alreadyAssignedToThis = gp.role?.id === role.id;
      if (!alreadyAssignedToThis && currentCount >= maxCount) {
        return res.status(400).json({ error: `Cannot assign ${roleName} — game allows ${maxCount} instances` });
      }
      // Connect the role
      const updated = await prisma.gamePlayer.update({ where: { id: gamePlayerId }, data: { role: { connect: { id: role.id } } }, include: { role: true, player: true } });
      const gamePlayers = await prisma.gamePlayer.findMany({ where: { gameId: game_id }, include: { player: true, role: true } });
      const assignments = gamePlayers.map(g => ({ gamePlayerId: g.id, playerId: g.playerId, playerName: g.player?.name ?? null, roleName: g.role ? g.role.roleName : null }));
      return res.json({ assignments, updated: { gamePlayerId: updated.id, roleName: updated.role?.roleName ?? null } });
    }

    // Single-instance roles: ensure not already assigned to another player in this game
    const existing = await prisma.gamePlayer.findFirst({ where: { gameId: game_id, roleId: role.id } });
    if (existing && existing.id !== gamePlayerId) {
      return res.status(400).json({ error: `${roleName} is already assigned to another player` });
    }

    // Connect role to this gamePlayer
    const updated = await prisma.gamePlayer.update({ where: { id: gamePlayerId }, data: { role: { connect: { id: role.id } } }, include: { role: true, player: true } });
    const gamePlayers = await prisma.gamePlayer.findMany({ where: { gameId: game_id }, include: { player: true, role: true } });
    const assignments = gamePlayers.map(g => ({ gamePlayerId: g.id, playerId: g.playerId, playerName: g.player?.name ?? null, roleName: g.role ? g.role.roleName : null }));
    res.json({ assignments, updated: { gamePlayerId: updated.id, roleName: updated.role?.roleName ?? null } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to assign role" });
  }
});

router.post("/game/:game_id/players", async (req: Request, res: Response) => {
  const { game_id } = req.params;
  const { player_id, player_name } = req.body;

  if (!game_id || typeof game_id !== 'string') {
    return res.status(400).json({ error: "Missing or invalid game_id parameter" });
  }
  if (!player_id && !player_name) {
    return res.status(400).json({ error: "Missing player_id or player_name" });
  }
  if (player_name && (typeof player_name !== 'string' || player_name.trim().length === 0)) {
    return res.status(400).json({ error: "Invalid player_name" });
  }
  if (player_id && (typeof player_id !== 'number' && typeof player_id !== 'string')) {
    return res.status(400).json({ error: "Invalid player_id" });
  }
  
  // At this point, we have either a player_name or player_id, exclusive
  let finalPlayerId = player_id;
  try {
    if (!finalPlayerId) {
      // We were only given a player_name, so let's create a Player with that name and get their id
      const createdPlayer = await prisma.player.create({
        data: {
          name: player_name,
          active: true,
        },
      });
      finalPlayerId = createdPlayer.id;
    }
    // At this point, finalPlayerId points to a valid player id. Let's add them to the game
    const newGamePlayer = await prisma.gamePlayer.create({
      data: {
        gameId: game_id,
        playerId: Number(finalPlayerId),
      },
    });
    res.json({ player: newGamePlayer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add player" });
  }
});

router.post("/game/:game_id/remove_player", async (req: Request, res: Response) => {
  const { game_id } = req.params;
  const { id } = req.body;

  if (!game_id) {
    return res.status(400).json({ error: "Missing game_id parameter" });
  }
  if (!id) {
    return res.status(400).json({ error: "Missing player ID" });
  }

  try {
    await prisma.gamePlayer.delete({
      where: {
        id: id,
      },
    });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove player" });
  }
});

router.get("/game/:game_id/valid_players", async (req: Request, res: Response) => {
  const { game_id } = req.params;
  if (!game_id) {
    return res.status(400).json({ error: "Missing game_id parameter" });
  }
  try {
    // Get IDs of players already in the game
    const inGameIds = await prisma.gamePlayer.findMany({
      where: { gameId: game_id },
      select: { playerId: true },
    }).then(gp => gp.map(gp => gp.playerId));

    // Get active players not in the game
    const players = await prisma.player.findMany({
      where: {
        active: true,
        id: { notIn: inGameIds }
      }
    });

    res.json({ players });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

router.get("/game/:game_id/quests", async (req: Request, res: Response) => {
  const { game_id } = req.params;
  if (!game_id) {
    return res.status(400).json({ error: "Missing game_id parameter" });
  }
  try {
    const quests = await prisma.quest.findMany({
      where: { gameId: game_id },
      include: {
      rounds: {
        include: {
        roundPlayers: true
        }
      }
      },
      orderBy: { id: "asc" }
    });
    res.json({ quests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch quests" });
  }
});

// POST /api/avalon/game/:game_id/set_king - set king for a round
router.post("/game/:game_id/set_king", async (req: Request, res: Response) => {
  const { game_id } = req.params;
  const { king, round_id } = req.body;
  if (!game_id) {
    return res.status(400).json({ error: "Missing game_id parameter" });
  }
  if (typeof king !== "number" || typeof round_id !== "number") {
    return res.status(400).json({ error: "Missing or invalid king or round_id" });
  }
  try {
    // Update the round's king
    const updatedRound = await prisma.round.update({
      where: { id: round_id },
      data: { king },
    });
    res.json({ round: updatedRound });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to set king" });
  }
});

router.post("/game/:game_id/toggle_team_player", async (req: Request, res: Response) => {
  const { game_id } = req.params;
  const { player_id, round_id } = req.body;
  if (!game_id) {
    return res.status(400).json({ error: "Missing game_id parameter" });
  }
  if (typeof player_id !== "number" || typeof round_id !== "number") {
    return res.status(400).json({ error: "Missing or invalid player_id or round_id" });
  }
  try {
    // Toggle the player's team status for the round
    const roundPlayer = await prisma.roundPlayer.findFirst({
      where: { roundId: round_id, playerId: player_id },
    });
    if (!roundPlayer) {
      return res.status(404).json({ error: "Round player not found" });
    }
    const updatedRoundPlayer = await prisma.roundPlayer.update({
      where: { id: roundPlayer.id },
      data: { team: !roundPlayer.team },
    });
    res.json({ roundPlayer: updatedRoundPlayer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to toggle team player" });
  }
});

router.post("/game/:game_id/toggle_votes", async (req: Request, res: Response) => {
  const { game_id } = req.params;
  const { player_id, round_id } = req.body;
  if (!game_id) {
    return res.status(400).json({ error: "Missing game_id parameter" });
  }
  if (typeof player_id !== "number" || typeof round_id !== "number") {
    return res.status(400).json({ error: "Missing or invalid player_id or round_id" });
  }
  try {
    // Toggle the player's approval vote for the round
    const roundPlayer = await prisma.roundPlayer.findFirst({
      where: { roundId: round_id, playerId: player_id },
    });
    if (!roundPlayer) {
      return res.status(404).json({ error: "Round player not found" });
    }
    const updatedRoundPlayer = await prisma.roundPlayer.update({
      where: { id: roundPlayer.id },
      data: { approval: !roundPlayer.approval },
    });
    res.json({ roundPlayer: updatedRoundPlayer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to toggle votes" });
  }
});

router.post("/game/:game_id/submit_failures", async (req: Request, res: Response) => {
  const { game_id } = req.params;
  const { count, round_id } = req.body;
  if (!game_id) {
    return res.status(400).json({ error: "Missing game_id parameter" });
  }
  if (typeof count !== "number" || typeof round_id !== "number") {
    return res.status(400).json({ error: "Missing or invalid count or round_id" });
  }
  try {
    // Update the round's fail count
    const updatedRound = await prisma.round.update({
      where: { id: round_id },
      data: { fails: count },
    });
    res.json({ round: updatedRound });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit failures" });
  }
});

router.post("/game/:game_id/submit_round", async (req: Request, res: Response) => {
  const { game_id } = req.params;
  const { round_id } = req.body;
  if (!game_id) {
    return res.status(400).json({ error: "Missing game_id parameter" });
  }
  if (typeof round_id !== "number") {
    return res.status(400).json({ error: "Missing or invalid round_id" });
  }
  // Attempt to archive game before creating new round or quest
  if (await getGameOutcome(game_id) !== 0) {
    try {
      await prisma.game.update({
        where: { id: game_id },
        data: { active: false },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to archive game" });
    }
    res.json({ message: "Game archived" });
    return;
  }
  // Game is still ongoing, so either create a new round in the current quest or a new quest with a new round
  try {
    // If the number of approval votes is greater than half the number of players AND there are no failures, the quest succeeds; so make a new quest with a new round
    const roundPlayers = await prisma.roundPlayer.findMany({
      where: { roundId: round_id },
    });
    const approvalVotes = roundPlayers.filter(rp => rp.approval).length;
    const playerCount = roundPlayers.length;
    const currentRound = await prisma.round.findUnique({
      where: { id: round_id },
      include: { quest: true }
    });
    if (!currentRound) {
      return res.status(404).json({ error: "Round not found" });
    }
    if (currentRound.fails > 0 || approvalVotes > playerCount / 2 && currentRound.fails === 0) {
      // Quest succeeded, create a new quest with a new round. Like when starting a new game, pick a random king
      const gamePlayers = await prisma.gamePlayer.findMany({
        where: { gameId: game_id },
        orderBy: { id: "asc" },
        include: { player: true }
      });
      const nextKingId = gamePlayers[(gamePlayers.findIndex(gp => gp.playerId === currentRound.king) + 1) % gamePlayers.length]?.playerId;
      if (!nextKingId) {
        return res.status(400).json({ error: "No players in game to set as king" });
      }
      const newQuest = await prisma.quest.create({
        data: {
          gameId: game_id,
          rounds: {
            create: {
              king: nextKingId,
              roundPlayers: {
                create: gamePlayers.map(gp => ({
                  playerId: gp.playerId,
                  team: false,
                  approval: false,
                })),
              },
              fails: 0,
            }
          }
        },
        include: {
          rounds: true
        }
      });
      res.json({ quest: newQuest });
    } else {
      // Quest failed, so just create a new round in the current quest
      const gamePlayers = await prisma.gamePlayer.findMany({
        where: { gameId: game_id },
        orderBy: { id: "asc" },
        include: { player: true }
      });
      const nextKingId = gamePlayers[(gamePlayers.findIndex(gp => gp.playerId === currentRound.king) + 1) % gamePlayers.length]?.playerId;
      if (!nextKingId) {
        return res.status(400).json({ error: "No players in game to set as king" });
      }
      const newRound = await prisma.round.create({
        data: {
          questId: currentRound.questId,
          king: nextKingId,
          roundPlayers: {
            create: gamePlayers.map(gp => ({
              playerId: gp.playerId,
              team: false,
              approval: false,
            })),
          },
          fails: 0,
        }
      });
      res.json({ round: newRound });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit round" });
  }
});

router.post("/game/:game_id/attempt_archival", async (req: Request, res: Response) => {
  const { game_id } = req.params;
  if (!game_id) {
    return res.status(400).json({ error: "Missing game_id parameter" });
  }
  try {
    if (await getGameOutcome(game_id) !== 0) {
      await prisma.game.update({
        where: { id: game_id },
        data: { active: false },
      });
      console.log("Game archived");
      res.json({ message: "Game archived", redirect: `/avalon/game/${game_id}` });
    } else {
      console.log("Game not over yet");
      res.status(400).json({ error: "Game is not in a terminal state" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to archive game" });
  }
});

router.post("/game/:game_id/force_archive", async (req: Request, res: Response) => {
  const { game_id } = req.params;
  if (!game_id) {
    return res.status(400).json({ error: "Missing game_id parameter" });
  }
  try {
    await prisma.game.update({
      where: { id: game_id },
      data: { active: false },
    });
    console.log("Game force-archived");
    res.json({ message: "Game force-archived", redirect: `/avalon/game/${game_id}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to archive game" });
  }
});

async function getRoundOutcome(round: Round, requiredFails: number = 1) {
  const roundPlayers = await prisma.roundPlayer.findMany({
    where: { roundId: round.id }
  });
  const approvalVotes = roundPlayers.filter(rp => rp.approval).length;
  const playerCount = roundPlayers.length;
  if (round.fails === 0 && approvalVotes > playerCount / 2) {
    return 1;
  }
  if (round.fails >= requiredFails) {
    return -1;
  }
  return 0;
}

async function getQuestOutcome(quest: Quest, questIndex: number, gamePlayerCount: number) {
  const rounds = await prisma.round.findMany({
    where: { questId: quest.id }
  });
  const isFourthQuest = questIndex === 3;
  const requiredFails = gamePlayerCount >= 7 && isFourthQuest ? 2 : 1;
  const outcomes = await Promise.all(rounds.map(round => getRoundOutcome(round, requiredFails)));
  if (outcomes.includes(1)) return 1;
  if (outcomes.includes(-1)) return -1;
  return 0;
}

async function getGameOutcome(gameId: string) {
  const quests = await prisma.quest.findMany({
    where: { gameId },
  });
  const gamePlayerCout = await prisma.gamePlayer.count({
    where: { gameId },
  });
  const gamePlayerCount = gamePlayerCout;
  const outcomes = await Promise.all(quests.map((q, idx) => getQuestOutcome(q, idx, gamePlayerCount)));
  const successCount = outcomes.filter(o => o === 1).length;
  const failCount = outcomes.filter(o => o === -1).length;
  if (successCount >= 3) return 1;
  if (failCount >= 3) return -1;
  return 0;
}

export default router;
