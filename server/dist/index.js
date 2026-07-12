"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
app.use(express_1.default.static(path_1.default.join(__dirname, "../public")));
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*",
    },
});
const PORT = Number(process.env.PORT) || 3000;
// FILE D'ATTENTE
const queue = [];
// PAGES
app.get("/", (req, res) => {
    res.sendFile(path_1.default.join(__dirname, "../public/index.html"));
});
app.get("/admin", (req, res) => {
    res.sendFile(path_1.default.join(__dirname, "../public/admin.html"));
});
// SOCKET.IO
io.on("connection", (socket) => {
    console.log("✅ Nouvelle connexion :", socket.id);
    // Envoie la file actuelle au nouvel utilisateur
    socket.emit("queueUpdated", queue);
    // Arrivée visiteur
    socket.on("joinQueue", (name) => {
        console.log("📥 joinQueue reçu :", name);
        queue.push({
            id: socket.id,
            name: name,
        });
        console.log("📋 File actuelle :", queue);
        io.emit("queueUpdated", queue);
    });
    // ADMIN APPELLE UN VISITEUR
    socket.on("callVisitor", (id) => {
        console.log("🎬 Visiteur appelé :", id);
        io.to(id).emit("visitorCalled");
    });
    // Déconnexion
    socket.on("disconnect", () => {
        console.log("❌ Déconnexion :", socket.id);
        const index = queue.findIndex((user) => user.id === socket.id);
        if (index !== -1) {
            queue.splice(index, 1);
            io.emit("queueUpdated", queue);
        }
    });
});
httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 InfinityLive serveur démarré sur le port ${PORT}`);
});
