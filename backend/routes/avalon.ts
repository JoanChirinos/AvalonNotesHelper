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
            player: true
          }
        }
      }
    });
    // Format games for frontend
    const formattedGames = games.map(game => ({
      game_id: game.id,
      start_time: game.start_time,
      player_count: game.players.length,
      player_names: game.players.map(gp => gp.player.name)
    }));
    res.json({ games: formattedGames });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch games" });
  }
});

export default router;
