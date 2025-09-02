import { Router } from "express";
import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

// GET all players
router.get("/", async (req: Request, res: Response) => {
  try {
    const players = await prisma.player.findMany();
    res.json(players);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

// POST a new player
router.post("/", async (req: Request, res: Response) => {
  const { name, active }: { name: string; active?: boolean } = req.body;
  try {
    const newPlayer = await prisma.player.create({
      data: { name, active: active ?? true },
    });
    res.json(newPlayer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create player" });
  }
});

export default router;
