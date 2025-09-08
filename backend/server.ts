import express from "express";
import fs from "fs";
import https from "https";
import http from "http";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import avalonRoutes from "./routes/avalon.js";

console.log(`Starting server. PROD=${process.env.PROD}`);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

if (process.env.PROD === "true") {
  const buildPath = path.resolve(__dirname, "../../frontend/build");
  app.use(express.static(buildPath));
  // Serve index.html for any unknown route (for React Router)
  app.get("*", (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"));
  });
}

// Middleware for logging requests
app.use((req, res, next) => {
  const now = new Date().toISOString(); // timestamp
  const method = req.method;
  const path = req.originalUrl;
  const query = JSON.stringify(req.query);
  const body = JSON.stringify(req.body);

  console.log(`[${now}] ${method} ${path} | query: ${query} | body: ${body}`);
  console.log(`${res.statusCode} ${res.statusMessage}`);
  next();
});

app.use("/api/avalon", avalonRoutes);

// Environment-based server setup
if (process.env.PROD === "true") {
  // Load certs
  const privateKey = fs.readFileSync(process.env.PRIVATE_KEY_PATH!);
  const certificate = fs.readFileSync(process.env.CERTIFICATE_PATH!);

  https.createServer({key: privateKey, cert: certificate}, app).listen(443, () => console.log("Server running on port 443"));

  // Redirect HTTP → HTTPS
  http.createServer((req, res) => {
    res.writeHead(301, { Location: "https://" + req.headers.host + req.url });
    res.end();
  }).listen(80, () => console.log("HTTP server redirecting to HTTPS"));
} else {
  app.listen(5000, () => console.log("Server running on port 5000"));
}