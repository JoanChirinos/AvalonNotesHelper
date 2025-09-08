import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import avalonRoutes from "./routes/avalon.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const buildPath = path.resolve(__dirname, "../../frontend/build");
app.use(express.static(buildPath));

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

app.use("/api/avalon", avalonRoutes);

// Serve index.html for any unknown route (for React Router)
app.get("*", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});

app.listen(5000, () => console.log("Server running on port 5000"));