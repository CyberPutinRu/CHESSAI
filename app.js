document.addEventListener('DOMContentLoaded', () => {
    // Game mode selection
    const gameModeSelection = document.getElementById('game-mode-selection');
    const multiplayerBtn = document.getElementById('multiplayer-btn');
    const stockfishBtn = document.getElementById('stockfish-btn');
    const stockfishOptions = document.getElementById('stockfish-options');
    const difficultySelect = document.getElementById('difficulty');
    const newGameBtn = document.getElementById('new-game-btn');
    const flipBoardBtn = document.getElementById('flip-board-btn');
    const playerTurn = document.getElementById('player-turn');
    const gameStatus = document.getElementById('game-status');
    const moveHistory = document.getElementById('move-history');

    // Game state
    let gameMode = null;
    let board = null;
    let game = new Chess();
    let stockfish = null;
    let userColor = 'white';
    let isFlipped = false;

    // Initialize Stockfish
    function initStockfish() {
        stockfish = STOCKFISH();
        stockfish.onmessage = function(event) {
            const message = event.data;
            
            // If the message is a move from Stockfish
            if (message.startsWith('bestmove')) {
                const moveStr = message.split(' ')[1];
                if (moveStr && moveStr !== '(none)') {
                    // Make the move on the board
                    const move = game.move({
                        from: moveStr.substring(0, 2),
                        to: moveStr.substring(2, 4),
                        promotion: moveStr.length === 5 ? moveStr.substring(4, 5) : undefined
                    });
                    
                    // Update the board
                    board.position(game.fen());
                    updateStatus();
                    addMoveToHistory(move);
                }
            }
        };
        
        // Initialize Stockfish with UCI
        stockfish.postMessage('uci');
        stockfish.postMessage('isready');
    }

    // Start a new game
    function startNewGame() {
        game = new Chess();
        updateStatus();
        moveHistory.innerHTML = '';
        
        // Create chessboard if it doesn't exist
        if (!board) {
            const config = {
                draggable: true,
                position: 'start',
                onDragStart: onDragStart,
                onDrop: onDrop,
                onSnapEnd: onSnapEnd
            };
            board = Chessboard('chessboard', config);
        } else {
            board.position('start');
        }
        
        // If playing against Stockfish and user is black, make Stockfish move
        if (gameMode === 'stockfish' && userColor === 'black') {
            makeStockfishMove();
        }
        
        // Adjust board orientation
        if (isFlipped) {
            board.orientation('black');
        } else {
            board.orientation('white');
        }
    }

    // Handle drag start
    function onDragStart(source, piece, position, orientation) {
        // Do not allow moves if the game is over
        if (game.game_over()) return false;
        
        // Only allow the current player to move pieces
        if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
            return false;
        }
        
        // If playing Stockfish, only allow moves for the user's color
        if (gameMode === 'stockfish') {
            if ((userColor === 'white' && piece.search(/^b/) !== -1) ||
                (userColor === 'black' && piece.search(/^w/) !== -1)) {
                return false;
            }
        }
    }

    // Handle piece drop
    function onDrop(source, target) {
        // See if the move is legal
        const move = game.move({
            from: source,
            to: target,
            promotion: 'q' // Always promote to queen for simplicity
        });
        
        // If illegal move, return piece to original position
        if (move === null) return 'snapback';
        
        // Update game status
        updateStatus();
        addMoveToHistory(move);
        
        // If playing against Stockfish, make the AI move
        if (gameMode === 'stockfish' && !game.game_over()) {
            setTimeout(makeStockfishMove, 250);
        }
    }

    // Update the board position after piece snap animation
    function onSnapEnd() {
        board.position(game.fen());
    }

    // Make Stockfish move
    function makeStockfishMove() {
        const depth = difficultySelect.value;
        
        stockfish.postMessage('position fen ' + game.fen());
        stockfish.postMessage('go depth ' + depth);
    }

    // Update game status
    function updateStatus() {
        let status = '';
        
        // Check for checkmate
        if (game.in_checkmate()) {
            status = (game.turn() === 'b') ? 'Game Over: White wins by checkmate' : 'Game Over: Black wins by checkmate';
        }
        // Check for draw
        else if (game.in_draw()) {
            status = 'Game Over: Draw';
            if (game.in_stalemate()) {
                status += ' (Stalemate)';
            } else if (game.in_threefold_repetition()) {
                status += ' (Threefold Repetition)';
            } else if (game.insufficient_material()) {
                status += ' (Insufficient Material)';
            } else {
                status += ' (50-move rule)';
            }
        }
        // Game still in progress
        else {
            const turn = game.turn() === 'w' ? 'White' : 'Black';
            status = '';
            
            // Check
            if (game.in_check()) {
                status = turn + ' is in check';
            }
            
            // Update whose turn it is
            playerTurn.textContent = turn + "'s turn";
        }
        
        gameStatus.textContent = status;
    }

    // Add move to history display
    function addMoveToHistory(move) {
        const moveNumber = Math.floor((game.history().length + 1) / 2);
        const isWhiteMove = game.history().length % 2 !== 0;
        
        let moveText = '';
        
        if (isWhiteMove) {
            const moveEntry = document.createElement('div');
            moveEntry.className = 'move-entry';
            
            const numberSpan = document.createElement('span');
            numberSpan.className = 'move-number';
            numberSpan.textContent = moveNumber + '.';
            
            const whiteMove = document.createElement('span');
            whiteMove.className = 'white-move';
            whiteMove.textContent = ' ' + move.san;
            
            moveEntry.appendChild(numberSpan);
            moveEntry.appendChild(whiteMove);
            moveHistory.appendChild(moveEntry);
        } else {
            const lastEntry = moveHistory.lastElementChild;
            const blackMove = document.createElement('span');
            blackMove.className = 'black-move';
            blackMove.textContent = ' ' + move.san;
            lastEntry.appendChild(blackMove);
        }
        
        // Scroll to the bottom of the move history
        moveHistory.scrollTop = moveHistory.scrollHeight;
    }

    // Event listeners
    multiplayerBtn.addEventListener('click', () => {
        gameMode = 'multiplayer';
        gameModeSelection.classList.remove('active');
        stockfishOptions.style.display = 'none';
        startNewGame();
    });

    stockfishBtn.addEventListener('click', () => {
        gameMode = 'stockfish';
        gameModeSelection.classList.remove('active');
        stockfishOptions.style.display = 'flex';
        initStockfish();
        startNewGame();
    });

    newGameBtn.addEventListener('click', () => {
        gameModeSelection.classList.add('active');
    });

    flipBoardBtn.addEventListener('click', () => {
        isFlipped = !isFlipped;
        board.orientation(isFlipped ? 'black' : 'white');
        
        if (gameMode === 'stockfish') {
            userColor = isFlipped ? 'black' : 'white';
            
            // If it's Stockfish's turn after flipping, make it move
            const isTurn = (game.turn() === 'w' && userColor === 'black') || 
                         (game.turn() === 'b' && userColor === 'white');
            
            if (isTurn && !game.game_over()) {
                setTimeout(makeStockfishMove, 250);
            }
        }
    });

    difficultySelect.addEventListener('change', () => {
        // No immediate action needed - will apply to next Stockfish move
    });

    // Adjust board size on window resize
    window.addEventListener('resize', () => {
        if (board) board.resize();
    });
});