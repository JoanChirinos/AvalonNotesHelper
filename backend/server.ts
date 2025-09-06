import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import fs from "fs";
import http from "http";
import https from "https";
import path from "path";
import avalonRoutes from "./routes/avalon.js";

const app = express();
app.use(cors());
app.use(express.json());

// Simple request logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const now = new Date().toISOString();
  console.log(
    `[${now}] ${req.method} ${req.originalUrl} | query: ${JSON.stringify(req.query)} | body: ${JSON.stringify(req.body)}`
  );
  next();
});

app.use("/api/avalon", avalonRoutes);

const PORT = 443; // HTTPS default

// Load cert and key issued by Let's Encrypt
const options = {
  key: fs.readFileSync("/Users/joanchirinos/certs/app/privkey.pem"),
  cert: fs.readFileSync("/Users/joanchirinos/certs/app/fullchain.pem")
};

// Start HTTPS server
https.createServer(options, app).listen(PORT, () => {
  console.log(`HTTPS server running on port ${PORT}`);
});

// Optionally redirect HTTP -> HTTPS
http.createServer((req: any, res: any) => {
  res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
  res.end();
}).listen(80, () => {
  console.log("HTTP server running on port 80 (redirect to HTTPS)");
});

