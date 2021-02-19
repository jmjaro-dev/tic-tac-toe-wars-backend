const { v4: uuidv4 } = require('uuid');

const rooms = [];
const players = [];

// Create Room 
const createRoom = () => {
  const id = uuidv4();
  const room = {
    id,
    players: []
  } 
  
  rooms.push(room);

  console.log(rooms);

  return room;
}

// Get Current Room 
const getCurrentRoom = (roomID) => {
  console.log(rooms);
  const currentRoom = rooms.filter(room => room.id === roomID);
  
  return currentRoom;
}

// Add player to Room 
const playerJoin = (id, name, room) => {
  const player = { id, name, room };

  players.push(player);

  return player;
}

// Player disconnects 
const removePlayer = (id) => {
  const index =  players.findIndex(player => player.id === id);

  if(index !== -1) {
    return players.splice(index, 1)[0];
  }
}

// Get Room players 
const getRoomPlayers = (room) => {
  return players.filter(player => player.room === room);
}

module.exports = {
  playerJoin,
  createRoom,
  getCurrentRoom,
  removePlayer, 
  getRoomPlayers
};