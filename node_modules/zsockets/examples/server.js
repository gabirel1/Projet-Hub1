const Socket = require("../socket");

const port = 500;

const Server = new Socket.Server(port, () => {
    console.log("Server listening on port", port);
});

Server.OnInternal("connection", (c) => {
    console.log("New client connected:", c.ip);

    setTimeout(() => {
        c.Emit("testevent", {});
    }, 500);

    c.On("testbackclient", () => {
        console.log("Back from specific client");
    });
});

setInterval(() => {
    Server.EmitToAll("testall", {});
}, 1000);