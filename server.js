const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Set up Express
const app = express();

app.use(cors());
app.use(express.json({ extended: false }));

const PORT = process.env.PORT || 5000;
console.log("Starting server...");

// Set up Monggose 
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

app.listen(PORT, () => console.log(`Server started on port: ${PORT}.`));