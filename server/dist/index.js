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
// MODE AUTOMATIQUE
let autoMode = false;
// ----------------------
// WEBRTC
// ----------------------
// Display connecté
let displaySocketId = null;
// Visiteur actuellement en caméra
let activeVisitorSocketId = null;
// ----------------------
// MISE A JOUR POSITIONS
// ----------------------
function updateQueuePositions() {
    queue.forEach((visitor, index) => {
        io.to(visitor.id).emit("queuePosition", index + 1);
    });
}
// ----------------------
// PASSAGE AUTOMATIQUE
// ----------------------
function callNextVisitor() {
    if (!autoMode)
        return;
    if (currentVisitor)
        return;
    if (queue.length === 0)
        return;
    const visitor = queue.shift();
    if (!visitor)
        return;
    currentVisitor = visitor;
    // Le visiteur devient celui de la caméra
    activeVisitorSocketId =
        visitor.id;
    io.emit("queueUpdated", queue);
    updateQueuePositions();
    io.emit("currentVisitor", currentVisitor);
    io.to(visitor.id)
        .emit("visitorCalled");
    console.log("Passage automatique :", visitor.name);
    // Le display gère désormais la fin du passage
}
// ----------------------
// ROUTES
// ----------------------
app.get("/", (req, res) => {
    res.sendFile(path_1.default.join(__dirname, "../public/index.html"));
});
app.get("/merci", (req, res) => {
    res.sendFile(path_1.default.join(__dirname, "../public/merci.html"));
});
app.get("/admin", (req, res) => {
    res.sendFile(path_1.default.join(__dirname, "../public/admin.html"));
});
app.get("/display", (req, res) => {
    res.sendFile(path_1.default.join(__dirname, "../public/display.html"));
});
app.get("/podium", (req, res) => {
    console.log("Route podium appelée");
    res.sendFile(path_1.default.join(__dirname, "../public/podium.html"));
});
// ----------------------
// SOCKET.IO
// ----------------------
io.on("connection", (socket) => {
    console.log("Nouvelle connexion :", socket.id);
    socket.emit("queueUpdated", queue);
    // ----------------------
    // START / STOP AUTOMATIQUE
    // ----------------------
    socket.on("startAuto", () => {
        autoMode = true;
        console.log("Mode automatique activé");
        callNextVisitor();
    });
    socket.on("stopAuto", () => {
        autoMode = false;
        console.log("Mode automatique arrêté");
    });
    // ----------------------
    // WEBRTC IDENTIFICATION
    // ----------------------
    socket.on("visitorReady", () => {
        console.log("Visiteur WebRTC prêt :", socket.id);
    });
    socket.on("displayReady", () => {
        displaySocketId =
            socket.id;
        console.log("Display WebRTC prêt :", socket.id);
    });
    // ----------------------
    // WEBRTC RELAIS
    // ----------------------
    socket.on("offer", (offer) => {
        console.log("📤 OFFER reçue :", socket.id);
        if (displaySocketId) {
            io.to(displaySocketId)
                .emit("offer", offer);
            console.log("➡️ OFFER envoyée au display");
        }
    });
    socket.on("answer", (answer) => {
        console.log("📥 ANSWER reçue :", socket.id);
        if (activeVisitorSocketId) {
            io.to(activeVisitorSocketId)
                .emit("answer", answer);
            console.log("➡️ ANSWER envoyée au visiteur");
        }
    });
    socket.on("iceCandidate", (candidate) => {
        console.log("🧊 ICE reçu :", socket.id);
        if (socket.id === activeVisitorSocketId) {
            if (displaySocketId) {
                io.to(displaySocketId)
                    .emit("iceCandidate", candidate);
            }
        }
        else {
            if (activeVisitorSocketId) {
                io.to(activeVisitorSocketId)
                    .emit("iceCandidate", candidate);
            }
        }
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
        callNextVisitor();
    });
    // ----------------------
    // VISITEUR QUITTE LA FILE
    // ----------------------
    socket.on("leaveQueue", () => {
        console.log("🚪 Visiteur demande à quitter :", socket.id);
        // CAS 1 : il est encore dans la file
        const index = queue.findIndex(user => user.id === socket.id);
        if (index !== -1) {
            const visitor = queue[index];
            queue.splice(index, 1);
            console.log("❌ Retiré de la file :", visitor.name);
            io.emit("queueUpdated", queue);
            updateQueuePositions();
            return;
        }
        // CAS 2 : il était en passage caméra
        if (currentVisitor &&
            currentVisitor.id === socket.id) {
            console.log("❌ Visiteur caméra parti :", currentVisitor.name);
            io.to(socket.id)
                .emit("visitorFinished");
            io.emit("currentVisitor", null);
            return;
        }
        console.log("⚠️ Visiteur introuvable");
    });
    // ----------------------
    // ADMIN MANUEL
    // ----------------------
    socket.on("callVisitor", (visitorId) => {
        const visitorIndex = queue.findIndex(user => user.id === visitorId);
        if (visitorIndex === -1)
            return;
        currentVisitor =
            queue[visitorIndex];
        activeVisitorSocketId =
            currentVisitor.id;
        queue.splice(visitorIndex, 1);
        updateQueuePositions();
        io.emit("queueUpdated", queue);
        io.emit("currentVisitor", currentVisitor);
        io.to(visitorId)
            .emit("visitorCalled");
        console.log("Visiteur appelé :", currentVisitor.name);
        // Le display décidera quand passer au visiteur suivant
    });
    // ----------------------
    // DISPLAY PRET POUR LE SUIVANT
    // ----------------------
    socket.on("displayReadyForNext", () => {
        currentVisitor = null;
        activeVisitorSocketId = null;
        callNextVisitor();
    });
    // ----------------------
    // DECONNEXION
    // ----------------------
    socket.on("disconnect", () => {
        if (socket.id === displaySocketId) {
            displaySocketId = null;
        }
        if (socket.id === activeVisitorSocketId) {
            activeVisitorSocketId = null;
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
