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

  console.log("Nouvelle connexion :", socket.id);


  socket.on("joinQueue", (name: string) => {

    queue.push({
      id: socket.id,
      name: name,
    });


    console.log("Nouvel arrivant :", name);


    // Envoi de la file à tous les admins
    io.emit("queueUpdated", queue);

  });



  socket.on("disconnect", () => {


    const index = queue.findIndex(
      (user) => user.id === socket.id
    );


    if (index !== -1) {

      queue.splice(index, 1);

      io.emit("queueUpdated", queue);

    }


    console.log("Déconnexion :", socket.id);

  });


});


// ----------------------
// START
// ----------------------

httpServer.listen(PORT, "0.0.0.0", () => {

  console.log(
    `InfinityLive serveur démarré sur le port ${PORT}`
  );

});