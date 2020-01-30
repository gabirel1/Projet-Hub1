const Sockets = require("zsockets");

const WSS = new Sockets.WebSocketServer(8080, () => {
    console.log("Listening on port 8080");
});

WSS.OnInternal("connection", (c) => {
    c.Emit("blblbl");

    c.On("test", () => {
        console.log("Back from client");
    });
});