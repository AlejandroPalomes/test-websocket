// var app = require('express')();
// var http = require('http').createServer(app);

// app.get('/', (req, res) => {
//   res.send('<h1>Hello world</h1>');
// });

// http.listen(3000, () => {
//   console.log('listening on *:3000');
// });

// ------------ \\

require.config({
  paths: {
      io: 'socket',
      hola: 'hola',
      plant: 'plant',
  }
});

define(['io', 'hola', 'plant'], function(io, hola, plant){

  // const io = require("socket.io");
  const server = io.listen(3000);
  server.on("connection", function(socket) {
    console.log("user connected");
    socket.emit("welcome", "welcome man");
  });

  var socket = io("http://localhost:3000");
  //use your socket
  socket.on("welcome", (message) => {
      // do something with the message.
  })
  // hola.hello("ale")
})


