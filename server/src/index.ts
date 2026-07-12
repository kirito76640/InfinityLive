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


// ----------------------
// FILE D'ATTENTE
// ----------------------

const queue: {
  id: string;
  name: string;
}[] = [];


// ----------------------
// PAGES
// ----------------------

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});


app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/admin.html"));
});


// ----------------------
// SOCKET.IO
// ----------------------

io.on("connection", (socket) => {

  console.log("✅ Nouvelle connexion :", socket.id);


  // Envoie la file actuelle au nouveau client
  socket.emit("queueUpdated", queue);


  socket.on("joinQueue", (name: string) => {

    console.log("📥 joinQueue reçu :", name);


    queue.push({
      id: socket.id,
      name: name,
    });


    console.log("📋 File actuelle :", queue);


    io.emit("queueUpdated", queue);

  });



  socket.on("disconnect", () => {


    console.log("❌ Déconnexion :", socket.id);


    const index = queue.findIndex(
      (user) => user.id === socket.id
    );


    if (index !== -1) {

      queue.splice(index, 1);

      console.log("📋 Nouvelle file :", queue);

      io.emit("queueUpdated", queue);

    }

  });


});


// ----------------------
// START
// ----------------------

httpServer.listen(PORT, "0.0.0.0", () => {

  console.log(
    `🚀 InfinityLive serveur démarré sur le port ${PORT}`
  );

});