var sio = require('socket.io');
var app = require('express')()
  , server = require('http').createServer(app)
  , io = sio.listen(server);

var fs = require('fs');

// Start listening on port 8080
server.listen(8080);

// Serve the index.html file
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

app.get('/grid.js', function (req, res) {
  res.sendfile(__dirname + '/grid.js');
});

function LoadWorld() {

 fs.readFile('world.map', 'utf8', function (err,data) {
  if (err) {
    return console.log("Failed to load map",err);
  }
  else {
  io.sockets.emit('message',{message: data});
  }
});

}


var _connectedUsers = [];
var _playingUsers = [];
var _quests = ["flowers", "ashes", "moss", "sand", "lava", "steam"];
var _gameHasStarted = false;
var _currentPlayer = null;
var _board = null;


function GetUserObject(id, userName) {
	return { id: id, userName: userName, quest: null, points: 0 };
}


function AddUserToServer(client, userName) {
	//TODO: client is changed on page reload
	var user = GetUserObject(client.id, userName);
	
	if(_connectedUsers.indexOf(user) > -1) {
		console.log("User exists", user);
	}
	else {
		_connectedUsers.push(user);
		console.log("Added user", _connectedUsers);
		io.sockets.emit('join', {user: user});
	}
}

function shuffle(o){ 
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};


function Init(client) {
	if(_gameHasStarted) {
		console.log("Your not allowed to connect since game has started");
		client.disconnect();
	}
	else {

		  io.sockets.socket(client.id).emit( "init", { usersOnline: _connectedUsers });
	}
}

function FinishMove(client, data) {

		var requestingUserId = client.id;
		console.log("requestingUser",requestingUserId);
		console.log("_currentPlayer",_currentPlayer);
		//Check that it is the correct player who clicked 
		if(_currentPlayer.id == requestingUserId)
		{
			var currentIndex = _playingUsers.indexOf(_currentPlayer);
			console.log("CurrentIndex", currentIndex);
			if(currentIndex == _playingUsers.length - 1) {
				_currentPlayer = _playingUsers[0];
			}
			else {
				_currentPlayer = _playingUsers[currentIndex+1];
			}
			//Todo: Uppdatera spelbärdan här

      transformBoard(data);

			io.sockets.emit('updateBoard', {board: _board });

      if(isGameOver()) {
        EndGame();
      }
      else {
        io.sockets.socket(_currentPlayer.id).emit("yourTurn",{message:'Your turn'});
      }
		}
		else {	
			   io.sockets.socket(requestingUserId).emit("message",{message:'Wait for your turn'});
		}
}

function EndGame() {
  for(var i = 0; i < _playingUsers.length; i++) {

      for(var x = 0; x < _board.length; x++) {
        for(var y = 0; y < _board[x].length; y++) {
          if(_board[x][y] == _playingUsers[i].quest) {
              _playingUsers[i].points++;
          }
      }
    }
  }
  //_playingUsers.sort()
  io.sockets.emit('gameOver', { users: _playingUsers });
}

function UpdateQuests() {
	
	var shuffledQuests = shuffle(_quests);
	
	//Assign a quest to each player
	for(var i = 0; i < _playingUsers.length;i++) {
		_playingUsers[i].quest = shuffledQuests[i];
	}
	
	//Send a the quest to each player so they can see which quest they are going for
	for(var i = 0; i < _playingUsers.length;i++) {
		io.sockets.socket(_playingUsers[i].id).emit("assignQuest",{quest: _playingUsers[i].quest});
	}
}

function StartGame(client) {
	if(!_gameHasStarted) {
		_gameHasStarted = true;
		console.log("Game has started", _gameHasStarted);
		

		_playingUsers = shuffle(_connectedUsers);
		console.log(_playingUsers);
		
		//Efter shuffle, sätt första spelaren;
		_currentPlayer = _playingUsers[0];

		//TODO: Skapa funktion för att skapa boarden.
		_board = [['blank','blank','blank'],
              ['blank','blank','blank']];
		
		UpdateQuests();
		
		io.sockets.emit('startGame', {message: "Game started", board: _board});
		io.sockets.socket(_currentPlayer.id).emit("yourTurn",{message:'Your turn'});
	}
}

// Called when client connects
io.sockets.on('connection', function (client) {

	Init(client);
		
	client.on('join', function (data) {
		AddUserToServer(client,data.userName);
	});
	
	client.on('finishedMove', function (data) {
		FinishMove(client, data);
	});
	
	client.on('startGame', function (data) {
		StartGame(client);
	});
	
	client.on('transformBoard', function (data) {
		transformBoard(data);
	});
});



  // Log data to the console
//	var inputFromUser = data.message;

    // Sends a message to all connected clients
   // io.sockets.emit('message', data);

	// use {'flags': 'a'} to append and {'flags': 'w'} to erase and write a new file
	// var stream = fs.createWriteStream("world.map", {'flags' : 'a'})	;
		// stream.once('open', function(fd) {
		// stream.write(inputFromUser);
		  // stream.end();
		// });
		
function transformBoard(data)
{
   
    var draw_x = data.x
    var draw_y = data.y
    var draw_element = data.type;

    //denna läses upp ur nåt på servern
    var tiles = _board;

    console.log("Tiles: ", tiles);
    //leta upp alla grannar
    var left_neighbor = [draw_y, draw_x-1];
    var right_neighbor = [draw_y, draw_x+1];
    var top_neighbor = [draw_y-1, draw_x];
    var bottom_neighbor = [draw_y+1, draw_x];
    
    var neighbors = [left_neighbor, right_neighbor, top_neighbor, bottom_neighbor];//array med grannarnas koordinater
    console.log(neighbors);
    //kolla om någon ska ombildas
    //en ruta ska ombildas om den är ett grundämne
    var transformations = [];
    for (var i = 0; i < neighbors.length; i++) {

      n_x = neighbors[i][0];
      n_y = neighbors[i][1];
      
      if(tiles[n_x] && tiles[n_x][n_y])
      {
        if(tiles[n_x][n_y] != "blank")//en granne som är blank ska aldrig påverkas
        {
          console.log("new elementar: ", draw_element,  tiles[n_x][n_y]);
          new_element = getNewElement(draw_element, tiles[n_x][n_y]);
          if(new_element != draw_element && new_element !=  tiles[n_x][n_y] && transformations.indexOf(new_element) == -1)
            transformations.push(new_element);
          tiles[n_x][n_y] = new_element;
        }
      }
    }
 
    console.log(transformations.length);
    console.log(transformations);
    //kolla om aktuell ruta ska ombildas eller tömmas
    //vi behöver veta vilka ombildningar som skett:
    //1. inga
    if(transformations.length == 0)
    {
      console.log("ingen trans!!!!")
      tiles[draw_y][draw_x] = draw_element;
    }
    //2. av en sort
    if(transformations.length == 1)
      tiles[draw_y][draw_x] = transformations[0];
    //3. av flera sorter
    if(transformations.length > 1)
      tiles[draw_y][draw_x] = "blank";

    console.log(data);

    //debug fulskriven för 3*3-bräda
    for (var i = 0; i < tiles.length; i++) {
      console.log(tiles[i][0] + " " + tiles[i][1] + " " + tiles[i][2]);
    }
    
    // Sends a message to all connected clients
    //io.sockets.emit('transformBoard', data);

    console.log("After transform", tiles);

    _board = tiles;
}

function getNewElement(draw_element, neighbor_element)
{

  if(draw_element == "fire")
  {
    if(neighbor_element == "water")
      return "steam";
    if(neighbor_element == "grass")
      return "ashes";
    if(neighbor_element == "stone")
      return "lava";

    return "fire";
  }

  if(draw_element == "water")
  {
    if(neighbor_element == "grass")
      return "flowers";
    if(neighbor_element == "fire")
      return "steam";
    if(neighbor_element == "stone")
      return "sand";
  }

  if(draw_element == "grass")
  {
    if(neighbor_element == "water")
      return "flowers";
    if(neighbor_element == "fire")
      return "ashes";
    if(neighbor_element == "stone")
      return "moss";

    return "grass";
  }

  if(draw_element == "stone")
  {
    if(neighbor_element == "water")
      return "sand";
    if(neighbor_element == "grass")
      return "moss";
    if(neighbor_element == "fire")
      return "lava";

    return "stone";
  }

  return neighbor_element;

}

function isGameOver() {
  for(var x = 0; x < _board.length; x++) {
    for(var y = 0; y < _board[x].length; y++) {
      if(_board[x][y] == "blank")
        return false;
    }
  }

  return true;
}
		
		
	
