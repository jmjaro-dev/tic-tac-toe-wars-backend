const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const http = require('http');
const socketio = require("socket.io");
require('dotenv').config();
// Utils
const { 
  playerJoin, 
  createRoom, 
  getCurrentRoom, 
  removePlayer, 
  getRoomPlayers 
} = require('./utils/utils');

// Set up Express
const app = express();

app.use(express.json({ extended: false }));

// Setup socket.io server
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "*"
  }
});

app.use(cors());

// Run when a client connects
io.on('connection', socket => {
  // Listen to 'newGame' event
  socket.on("createGame", () => {
    const room = createRoom();
    // Emit 'roomCreated' event to client passing the room ID
    socket.emit("roomCreated", room);
  });

  // Listen to "newRoomJoin" event
  socket.on("newRoomJoin", ({ room, name }) => {
    // If room and name is not provided redirect to home page
    if((room === '' || room === undefined) && (name === '' || name === undefined)) {
      io.to(socket.id).emit("joinError");
    }

    // Put new player into the room
    socket.join(room);
    const id = socket.id;
    playerJoin(id, name, room);

    // Get Room players
    const playersInRoom = getRoomPlayers(room);

    // If not enough players in room emit 'waiting' event
    if(playersInRoom.length === 1){
      io.to(room).emit("waiting");
    }

    if(playersInRoom.length === 2) {
      io.to(room).emit("starting");
    }
  })

  // removePlayer from rooms when disconnected
  socket.on("disconnect", () => {
    removePlayer(socket.id);
    socket.disconnect();
  });
});

// Serve static assets if in Production
if(process.env.NODE_ENV === 'production') {
  // Set a static folder
  app.use(express.static('build'));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
console.log("Starting server...");

// Connect to MongoDB 
console.log("Connecting to MongoDB...")
mongoose.connect(process.env.MONGODB_URI, 
  { 
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false 
  }, (err) => {
  if(err) return console.log(err);

  console.log("MongoDB Connection established.");
});

server.listen(PORT, () => console.log(`Server started on port: ${PORT}.`));