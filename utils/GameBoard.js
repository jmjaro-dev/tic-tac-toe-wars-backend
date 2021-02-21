class GameBoard {
  constructor() {
    this.board =['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    this.winningConditions = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    this.movesLeft = 9;
    this.turn = 'X';
  }
  
  // Player move
  playerMove(idx, token) {
    if(this.determineWinner(this.board) || (this.board[idx] === 'X' || this.board[idx] === 'O')) {
      return;
    }

    if(this.movesLeft > 0) {
      this.board[idx] = token;
      this.movesLeft-=1;
    } 
  }

  // Switch Turn
  switchTurn() {
    this.turn === 'X' ? this.turn = 'O' : this.turn = 'X';  
  }

  // Check for Winner
  determineWinner(board) {
    for (let i = 0; i < this.winningConditions.length; i++) {
      const [a, b, c] = this.winningConditions[i];
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  }

  // Reset Game
  resetGame() {
    this.board =['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    this.turn = 'X';
    this.movesLeft = 9;
  }

}

module.exports = GameBoard;