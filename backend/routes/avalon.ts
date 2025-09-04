import { Router } from "express";
import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();
const router = Router();

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
        start_time: "asc",
      }
    });
    // Format games for frontend
    const formattedGames = games.map(game => ({
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
      player_names: game.players.map(gp => gp.player.name),
      active: game.quests.length > 0,
    }));
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
    const updatedGame = await prisma.game.update({
      where: {
        id: game_id,
        active: true,
      },
      data: { quests: { create: {} } },
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

router.post("/game/:game_id/players", async (req: Request, res: Response) => {
  const { game_id } = req.params;
  const { player_id, player_name } = req.body;

  if (!game_id) {
    return res.status(400).json({ error: "Missing game_id parameter" });
  }
  if (!player_id && !player_name) {
    return res.status(400).json({ error: "Missing player_id or player_name" });
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

export default router;
