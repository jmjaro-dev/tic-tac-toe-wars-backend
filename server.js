const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const http = require('http');
const socketio = require("socket.io");
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
// Utils
const GameBoard = require('./utils/GameBoard');
const chooseTurn = require('./utils/utils');

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

// ! API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/scores', require('./routes/scores'));

// ! Room State
const rooms = [];

// ? Room Functions
// Create Room 
const createRoom = (resolve) => {
  const id = uuidv4();
  const room = {
    id,
    players: [],
    board: null
  } 
  
  rooms.push(room);

  resolve(room.id);
}

// Check Room existence
const checkRoomExistence = (roomID) => {
  const index =  rooms.findIndex(room => room.id === roomID);
  
  if(index !== -1) {
    return true;
  } else {
    return false;
  }
}

// Get Current Room 
const getCurrentRoom = (roomID) => {
  currentRoom = rooms.filter(room => room.id === roomID);
  
  return currentRoom;
}

// Delete Room 
const deleteRoom = (roomID) => {
  const index =  rooms.findIndex(room => room.id === roomID);

  if(index !== -1) {
    rooms.splice(index, 1)[0];
    
    return rooms;
  }
}

// ! Game functions
// Assign Tokens to Players in Current Room
const assignToken = (room) => {
  const p1Token = chooseTurn();
  const p2Token = p1Token === 'X' ? 'O': 'X';

  if(room.players.length === 2) {
    room.players[1].token = p2Token;
    room.players[0].token = p1Token;
  }
}

// Make a New Board 
const newBoard = (room) => {
  currentRoom = getCurrentRoom(room)[0];
  const board = new GameBoard;
  currentRoom.board = board;
}

// ? Player functions
// Add player to Room 
const playerJoin = (id, name, userId, room, wins) => {
  const player = { id, name, userId, room, wins, token: null };

  const index = rooms.findIndex(room => room.id === player.room);

  rooms[index].players.push(player);
}

//  Kick Player from room
function kickPlayer(room){
  currentRoom = getCurrentRoom(room)[0];
  currentRoom.players.pop();
}

// If Player disconnects/left the room then remove in room players 
function removePlayer(playerID, roomID){
  // Get Room Index
  const roomIndex = rooms.findIndex(room => room.id === roomID);

  if(roomIndex !== -1) {
    const playerIndex = rooms[roomIndex].players.findIndex(player => player.id === playerID);

    if(playerIndex !== -1) {
      return rooms[roomIndex].players.splice(playerIndex, 1)[0];
    }
  }
}

// Get the room of the player 
function getPlayerRoom(playerID) {
  const playerRoom = rooms.filter(room => room.players.filter(player => player.id === playerID));
  
  if(playerRoom.length > 0) {
    return playerRoom[0].id;
  }
}

// Get Room players 
function getRoomPlayers(roomID) {
  if(rooms.length > 0) {
    const room = rooms.filter(room => room.id === roomID)[0];
    if(room.players !== undefined) {
      const players = rooms.filter(room => room.id === roomID)[0].players; 
      return players;
    } 
    return null;
  }
}

// Run when a client connects
io.on('connection', socket => {
  // Listen to 'newGame' event
  socket.on("createGame", () => {
    // Emit 'roomCreated' event to client passing the room ID
    new Promise(createRoom).then(room => socket.emit("roomCreated", room ));
  });

  // Listen to 'joinGame' event
  socket.on("joinGame", (room) => {
    // Check if room is existing
    if(checkRoomExistence(room)) {
      socket.emit("joinConfirmed", room );
    } else {
      const error = "Room does not exist.";
      socket.emit("onJoinError", error );
    }
  });

  // Listen to "newRoomJoin" event
  socket.on("newRoomJoin", ({ room, userId, name, wins }) => {
    // If room and name is not provided redirect to home page
    if((room === '' || room === undefined) && (name === '' || name === undefined)) {
      io.to(socket.id).emit("joinError");
    }

    if(checkRoomExistence(room)) {
      // Put new player into the room
      socket.join(room);
      const id = socket.id;
      playerJoin(id, name, userId, room, wins);

      // Get Room players
      currentRoom = getCurrentRoom(room)[0];
      playersInRoom = currentRoom.players;
      if(playersInRoom === null) io.to(socket.id).emit("joinError");
      // If not enough players in room emit 'waiting' event
      if(playersInRoom.length === 1){
        // Get Current Room
        currentRoom = getCurrentRoom(room)[0];
        if(currentRoom.board) {
          // Get Current Board
          currentBoard = currentRoom.board;
          currentBoard.resetGame();
        }
        io.to(room).emit("waiting");
      }

      // If have enough players then set the Game 
      if(playersInRoom.length === 2) {
        currentRoom = getCurrentRoom(room)[0];
        // Assign Tokens
        assignToken(currentRoom);
        // Emit 'tokenAssignment' to players
        playersInRoom.forEach(player => io.to(player.id).emit('tokenAssignment', { playerToken: player.token }));
        // Initialize a new Board for the Current Room
        newBoard(room);

        const boardState = currentRoom.board.board;
        const firstTurn = currentRoom.board.turn;
        const players = playersInRoom;
        // Emit 'starting' event and send the Game state to players
        io.to(room).emit("starting", { boardState, firstTurn, players });
      }

      // If players > 3 kick last player who entered the room 
      if(playersInRoom.length === 3) {
        socket.leave(room);
        kickPlayer(room);
        const error = "Already have enough players in the room";
        io.to(socket.id).emit("joinError", error);
      }
    } else {
      const error = "Room does not exists.";
      io.to(socket.id).emit("joinError", error);
    }
  })

  // Listen for "playerMove" event and emit "winner" if there is already a winner or "updateBoard" event to update the game board
  socket.on("playerMove", ({ room, token, idx }) => {
    currentRoom = getCurrentRoom(room)[0];
    currentBoard = getCurrentRoom(room)[0].board;
    currentBoard.playerMove(idx, token);
    playerWhoWon = currentBoard.determineWinner(currentBoard.board);
    
    // Check for winner
    if(playerWhoWon !== null && currentBoard.movesLeft > 0) {
      currentRoom[0].players.forEach(player => {
        if(player.token === playerWhoWon) {
          player.wins = player.wins + 1;
        }

        return player;
      })
      // Emit Winner event to Client
      io.to(room).emit('winner', { boardState: currentBoard.board, playerWhoWon, players: playersInRoom });
    } else if(playerWhoWon === null && currentBoard.movesLeft === 0 ) {
      // Check for draw
      io.to(room).emit('draw', { boardState: currentBoard.board, movesLeft: currentBoard.movesLeft });
    } else {
      currentBoard.switchTurn();
      io.to(room).emit('updateBoard', { boardState: currentBoard.board, nextTurn: currentBoard.turn, movesLeft: currentBoard.movesLeft, players: playersInRoom })
    }   
  });


  // Listen to "rematchRequest"
  socket.on("rematchRequest", ({ room, name }) => {
    socket.broadcast.to(room).emit("rematchRequestFromOpponent", name);
  });

  // Listen to "rematchDecline"
  socket.on("rematchDecline", ({ room, name }) => {
    // socket.broadcast.to(room).emit("rematchRequestDeclined", name);
    io.to(room).emit("rematchRequestDeclined", name);
  });

  // Listen to "rematchConfirm"
  socket.on("rematchConfirm", ({ room, name }) => {
    io.to(room).emit("rematchConfirmed", { room, name });
  });

  // Listen to rematchAcknowledged
  socket.on("rematchAcknowledged", (room) => {
    // Get Current Room
    currentRoom = getCurrentRoom(room)[0];
    // Get Current Board
    currentBoard = currentRoom.board;
    // reset Board
    currentBoard.resetGame();
    // reassign tokens
    assignToken(currentRoom);
    // Emit 'tokenAssignment' to players
    currentRoom.players.forEach(player => io.to(player.id).emit('tokenAssignment', { playerToken: player.token }));
    
    // Emit 'restartGame' event to players in the room
    const boardState = currentRoom.board.board;
    const firstTurn = currentRoom.board.turn;
    const movesLeft = currentRoom.board.movesLeft;
    io.to(room).emit("restartGame", { boardState, firstTurn, movesLeft, players: currentRoom.players });
  });

  // Listen for "roomLeave" event and check if the room has players, if no players then delete the room
  socket.on("roomLeave", (room) => {
    // Leave Room
    socket.leave(room);
    // Remove Player in rooms array
    removePlayer(socket.id, room);

    num = getRoomPlayers(room);

    // Delete Room if no players
    if(num && num.length === 0) {
      deleteRoom(room);
    }

    if(num && num.length === 1) {
      io.to(room).emit("waiting");
    }
    socket.offAny();
  })

  // removePlayer from rooms when disconnected
  socket.on("disconnect", () => {
    if(rooms.length > 0) {
      const room = getPlayerRoom(socket.id);
      socket.leave(room);
      removePlayer(socket.id, room);
    }
    socket.offAny();
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