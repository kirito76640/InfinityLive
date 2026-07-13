import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";

const app = express();


// Dossier public
app.use(express.static(path.join(__dirname, "../public")));


const httpServer = createServer(app);


const io = new Server(httpServer, {
    cors: {
        origin: "*",
    },
});


const PORT: number = Number(process.env.PORT) || 3000;



// ============================
// FILE D'ATTENTE
// ============================

type Visitor = {

    id: string;

    name: string;

    status: "waiting" | "called";

};


const queue: Visitor[] = [];





// ============================
// ROUTES DES PAGES
// ============================


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




// ✅ ROUTE DISPLAY

app.get("/display", (req, res) => {

    res.sendFile(
        path.join(__dirname, "../public/display.html")
    );

});







// ============================
// SOCKET.IO
// ============================


io.on("connection", (socket) => {


    console.log(
        "✅ Nouvelle connexion :",
        socket.id
    );



    // Envoie l'état actuel

    socket.emit(
        "queueUpdated",
        queue
    );





    // -------------------------
    // VISITEUR ARRIVE
    // -------------------------


    socket.on("joinQueue", (name: string) => {



        console.log(
            "📥 Nouveau visiteur :",
            name
        );



        const visitor: Visitor = {

            id: socket.id,

            name: name,

            status: "waiting"

        };



        queue.push(visitor);



        console.log(
            "📋 File actuelle :",
            queue
        );



        io.emit(
            "queueUpdated",
            queue
        );



    });








    // -------------------------
    // ADMIN APPELLE UN VISITEUR
    // -------------------------


    socket.on(
        "callVisitor",
        (visitorId: string) => {



            console.log(
                "🎬 Appel visiteur :",
                visitorId
            );



            const visitor =
            queue.find(
                (user) =>
                user.id === visitorId
            );



            if(!visitor){

                console.log(
                    "❌ Visiteur introuvable"
                );

                return;

            }




            visitor.status = "called";



            // Message au visiteur

            io.to(visitorId).emit(
                "visitorCalled"
            );



            // Mise à jour admin + display

            io.emit(
                "queueUpdated",
                queue
            );



        }
    );








    // -------------------------
    // DECONNEXION
    // -------------------------


    socket.on(
        "disconnect",
        () => {



            console.log(
                "❌ Déconnexion :",
                socket.id
            );



            const index =
            queue.findIndex(
                (user) =>
                user.id === socket.id
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



        }
    );



});








// ============================
// DEMARRAGE
// ============================


httpServer.listen(
    PORT,
    "0.0.0.0",
    () => {


        console.log(
            `🚀 InfinityLive serveur démarré sur le port ${PORT}`
        );


    }
);