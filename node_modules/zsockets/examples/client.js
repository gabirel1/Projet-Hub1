const Socket = require("../socket");

const Client = new Socket.Client("127.0.0.1", 500);

Client.On("testevent", () => {
    console.log("It works UwU");

    Client.Emit("testbackclient", {})
});

Client.On("testall", () => {
    console.log("All clients yay !");
});