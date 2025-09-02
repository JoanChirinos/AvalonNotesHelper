import express from "express";
import cors from "cors";
import playersRoutes from "./routes/players.ts";
import avalonRoutes from "./routes/avalon.ts";

const app = express();
app.use(cors());
app.use(express.json());

app.listen(5000, () => console.log("Server running on port 5000"));

// Middleware for logging requests
app.use((req, res, next) => {
  const now = new Date().toISOString(); // timestamp
  const method = req.method;
  const path = req.originalUrl;
  const query = JSON.stringify(req.query);
  const body = JSON.stringify(req.body);

  console.log(`[${now}] ${method} ${path} | query: ${query} | body: ${body}`);
  next();
});

app.use("/api/players", playersRoutes);
app.use("/api/avalon", avalonRoutes);