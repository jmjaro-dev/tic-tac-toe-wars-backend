const chooseTurn = _ => {
  const turn = Math.floor((Math.random() * 2 + 1));

  return turn === 1 ? 'X' : 'O';
}

module.exports = chooseTurn;