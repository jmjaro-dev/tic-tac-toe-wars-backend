const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const http = require('http');
const socketio = require('socket.io');
require('dotenv').config();

// Set up Express
const app = express();

app.use(cors());

app.use(express.json({ extended: false }));

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
  if(err) return console.error(err);

  console.log("MongoDB Connection established.");
});

// Setup socket.io server
const server = http.createServer(app);
const io = socketio(server);


// Run when a client connects
io.on('connection', socket => {
  console.log('A user connected');
});

app.listen(PORT, () => console.log(`Server started on port: ${PORT}.`));