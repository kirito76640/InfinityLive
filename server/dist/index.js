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
// ----------------------
// FILE D'ATTENTE
// ----------------------
const queue = [];
let currentVisitor = null;
let displayTimer = null;
// Connexion WebRTC
const visitorSockets = new Map();
let displaySocketId = null;
// ----------------------
// MISE A JOUR POSITIONS
// ----------------------
function updateQueuePositions() {
    queue.forEach((visitor, index) => {
        io.to(visitor.id).emit("queuePosition", index + 1);
    });
}
// ----------------------
// ROUTES
// ----------------------
app.get("/", (req, res) => {
    res.sendFile(path_1.default.join(__dirname, "../public/index.html"));
});
app.get("/admin", (req, res) => {
    res.sendFile(path_1.default.join(__dirname, "../public/admin.html"));
});
app.get("/display", (req, res) => {
    res.sendFile(path_1.default.join(__dirname, "../public/display.html"));
});
// ----------------------
// SOCKET.IO
// ----------------------
io.on("connection", (socket) => {
    console.log("Nouvelle connexion :", socket.id);
    socket.emit("queueUpdated", queue);
    // ----------------------
    // WEBRTC IDENTIFICATION
    // ----------------------
    socket.on("visitorReady", () => {
        visitorSockets.set(socket.id, socket.id);
        console.log("Visiteur WebRTC prêt :", socket.id);
    });
    socket.on("displayReady", () => {
        displaySocketId = socket.id;
        console.log("Display WebRTC prêt :", socket.id);
    });
    // ----------------------
    // WEBRTC RELAIS
    // ----------------------
    socket.on("offer", (offer) => {
        if (displaySocketId) {
            io.to(displaySocketId)
                .emit("offer", offer);
        }
    });
    socket.on("answer", (answer) => {
        const visitor = currentVisitor?.id;
        if (visitor) {
            io.to(visitor)
                .emit("answer", answer);
        }
    });
    socket.on("iceCandidate", (candidate) => {
        socket.broadcast.emit("iceCandidate", candidate);
    });
    // ----------------------
    // VISITEUR REJOINT
    // ----------------------
    socket.on("joinQueue", (name) => {
        const visitor = {
            id: socket.id,
            name: name
        };
        queue.push(visitor);
        console.log("Nouvel arrivant :", name);
        io.emit("queueUpdated", queue);
        updateQueuePositions();
    });
    // ----------------------
    // ADMIN FAIRE PASSER
    // ----------------------
    socket.on("callVisitor", (visitorId) => {
        const visitorIndex = queue.findIndex(user => user.id === visitorId);
        if (visitorIndex === -1)
            return;
        currentVisitor =
            queue[visitorIndex];
        queue.splice(visitorIndex, 1);
        updateQueuePositions();
        io.emit("queueUpdated", queue);
        io.emit("currentVisitor", currentVisitor);
        io.to(visitorId)
            .emit("visitorCalled");
        console.log("Visiteur appelé :", currentVisitor.name);
        if (displayTimer) {
            clearTimeout(displayTimer);
        }
        displayTimer =
            setTimeout(() => {
                currentVisitor = null;
                io.emit("currentVisitor", null);
                console.log("Display remis en attente.");
            }, 10000);
    });
    // ----------------------
    // DECONNEXION
    // ----------------------
    socket.on("disconnect", () => {
        visitorSockets.delete(socket.id);
        if (socket.id === displaySocketId) {
            displaySocketId = null;
        }
        const index = queue.findIndex(user => user.id === socket.id);
        if (index !== -1) {
            queue.splice(index, 1);
            io.emit("queueUpdated", queue);
            updateQueuePositions();
        }
        console.log("Déconnexion :", socket.id);
    });
});
// ----------------------
// DEMARRAGE
// ----------------------
httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 InfinityLive serveur démarré sur le port ${PORT}`);
});
