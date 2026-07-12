import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";

const app = express();

app.use(express.static(path.join(__dirname, "../public")));

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

const PORT: number = Number(process.env.PORT) || 3000;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

io.on("connection", (socket) => {
  console.log("Nouvelle connexion :", socket.id);

  socket.on("disconnect", () => {
    console.log("Déconnexion :", socket.id);
  });
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`InfinityLive serveur démarré sur le port ${PORT}`);
});