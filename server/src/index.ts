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



    // Envoi de la file actuelle au nouvel admin

    socket.emit(
        "queueUpdated",
        queue
    );




    // Visiteur rejoint

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





    // ADMIN : faire passer un visiteur

    socket.on(
        "callVisitor",
        (visitorId:string)=>{


            const visitorIndex =
            queue.findIndex(
                user => user.id === visitorId
            );



            if(visitorIndex !== -1){


                currentVisitor =
                queue[visitorIndex];



                queue.splice(
                    visitorIndex,
                    1
                );



                console.log(
                    "Visiteur appelé :",
                    currentVisitor.name
                );



                io.emit(
                    "queueUpdated",
                    queue
                );



                io.emit(
                    "currentVisitor",
                    currentVisitor
                );



                io.to(visitorId).emit(
                    "visitorCalled"
                );


            }


        }
    );





    // ADMIN : terminer

    socket.on(
        "finishVisitor",
        ()=>{


            currentVisitor = null;



            io.emit(
                "currentVisitor",
                null
            );


        }
    );






    socket.on(
        "disconnect",
        ()=>{


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
            `InfinityLive serveur démarré sur le port ${PORT}`
        );

    }
);