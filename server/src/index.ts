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


let currentVisitor: {
    id: string;
    name: string;
} | null = null;


// Timer du display
let displayTimer: NodeJS.Timeout | null = null;


// Connexion WebRTC
let visitorSocketId: string | null = null;
let displaySocketId: string | null = null;




// ----------------------
// ROUTES
// ----------------------

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "../public/index.html")
    );

});


app.get("/admin", (req, res) => {

    res.sendFile(
        path.join(__dirname, "../public/admin.html")
    );

});


app.get("/display", (req, res) => {

    res.sendFile(
        path.join(__dirname, "../public/display.html")
    );

});






// ----------------------
// SOCKET.IO
// ----------------------

io.on("connection", (socket) => {


    console.log(
        "Nouvelle connexion :",
        socket.id
    );



    socket.emit(
        "queueUpdated",
        queue
    );



    // ----------------------
    // IDENTIFICATION WEBRTC
    // ----------------------

    socket.on(
        "visitorReady",
        () => {

            visitorSocketId = socket.id;

            console.log(
                "Visiteur WebRTC prêt :",
                socket.id
            );

        }
    );



    socket.on(
        "displayReady",
        () => {

            displaySocketId = socket.id;

            console.log(
                "Display WebRTC prêt :",
                socket.id
            );

        }
    );





    // ----------------------
    // RELAIS WEBRTC
    // ----------------------

    socket.on(
        "offer",
        (offer) => {


            if(displaySocketId){

                io.to(displaySocketId)
                .emit(
                    "offer",
                    offer
                );

            }


        }
    );



    socket.on(
        "answer",
        (answer) => {


            if(visitorSocketId){

                io.to(visitorSocketId)
                .emit(
                    "answer",
                    answer
                );

            }


        }
    );



    socket.on(
        "iceCandidate",
        (candidate) => {


            socket.broadcast.emit(
                "iceCandidate",
                candidate
            );


        }
    );





    // ----------------------
    // VISITEUR FILE
    // ----------------------

    socket.on(
        "joinQueue",
        (name:string)=>{


            const visitor = {

                id: socket.id,

                name:name

            };


            queue.push(visitor);



            console.log(
                "Nouvel arrivant :",
                name
            );



            io.emit(
                "queueUpdated",
                queue
            );


        }
    );






    // ----------------------
    // ADMIN FAIRE PASSER
    // ----------------------

    socket.on(
        "callVisitor",
        (visitorId:string)=>{


            const visitorIndex =
            queue.findIndex(
                user => user.id === visitorId
            );



            if(visitorIndex === -1)
                return;



            currentVisitor =
            queue[visitorIndex];



            queue.splice(
                visitorIndex,
                1
            );



            io.emit(
                "queueUpdated",
                queue
            );



            io.emit(
                "currentVisitor",
                currentVisitor
            );



            io.to(visitorId)
            .emit(
                "visitorCalled"
            );



            console.log(
                "Visiteur appelé :",
                currentVisitor.name
            );



            if(displayTimer){

                clearTimeout(displayTimer);

            }



            displayTimer = setTimeout(()=>{


                currentVisitor = null;


                io.emit(
                    "currentVisitor",
                    null
                );


                console.log(
                    "Display remis en attente."
                );


            },10000);



        }
    );






    // ----------------------
    // DECONNEXION
    // ----------------------

    socket.on(
        "disconnect",
        ()=>{


            if(socket.id === visitorSocketId){

                visitorSocketId = null;

            }


            if(socket.id === displaySocketId){

                displaySocketId = null;

            }



            const index =
            queue.findIndex(
                user => user.id === socket.id
            );



            if(index !== -1){


                queue.splice(
                    index,
                    1
                );


                io.emit(
                    "queueUpdated",
                    queue
                );

            }



            console.log(
                "Déconnexion :",
                socket.id
            );


        }
    );


});






// ----------------------
// DEMARRAGE
// ----------------------

httpServer.listen(
    PORT,
    "0.0.0.0",
    ()=>{


        console.log(
            `🚀 InfinityLive serveur démarré sur le port ${PORT}`
        );


    }
);