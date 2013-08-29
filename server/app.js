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

var connectedUsers = [];
var turns = [];
var _gameHasStarted = false;
var _currentPlayer = null;

function AddUserToServer(client) {
	//TODO: client is changed on page reload
	var userName = client.id;
	
	if(connectedUsers.indexOf(userName) > -1) {
		console.log("User exists", userName);
	}
	else {
		connectedUsers.push(userName);
		console.log("Added user", connectedUsers);
		io.sockets.emit('join', {user: userName});
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
		  io.sockets.socket(client.id).emit( "init", { usersOnline: connectedUsers });
	}
}

function FinishMove(client) {

		var requestingUser = client.id;
		console.log("requestingUser",requestingUser);
		console.log("_currentPlayer",_currentPlayer);
		//Check that it is the correct player who clicked 
		if(_currentPlayer == requestingUser)
		{
			var currentIndex = turns.indexOf(_currentPlayer);
			console.log("CurrentIndex", currentIndex);
			if(currentIndex == turns.length - 1) {
				_currentPlayer = turns[0];
			}
			else {
				_currentPlayer = turns[currentIndex+1];
			}
			 io.sockets.socket(_currentPlayer).emit("yourTurn",{message:'Your turn'});
		}
		else {
			   io.sockets.socket(requestingUser).emit("message",{message:'Wait for your turn'});
		}
}

function StartGame(client) {
	if(!_gameHasStarted) {
		_gameHasStarted = true;
		console.log("Game has started", _gameHasStarted);
		
		turns = shuffle(connectedUsers);
		console.log(turns);
		
		//Efter shuffle, sätt första spelaren;
		_currentPlayer = turns[0];
		
		io.sockets.emit('startGame', {});
		io.sockets.socket(_currentPlayer).emit("yourTurn",{message:'Your turn'});
	}
}

// Called when client connects
io.sockets.on('connection', function (client) {

	Init(client);
		
	client.on('join', function (data) {
		AddUserToServer(client);
	});
	
	client.on('finishedMove', function (data) {
		FinishMove(client);
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
   
    var draw_x = 1;//data.x
    var draw_y = 1;//data.y
    var draw_element = data.type;

    //denna läses upp ur nåt på servern
    var tiles = [
    ['blank','fire','grass'],
    ['grass','blank','water'],
    ['water','grass','sand'], 
    ];

    //leta upp alla grannar
    var left_neighbor = [draw_x-1, draw_y];
    var right_neighbor = [draw_x+1, draw_y];
    var top_neighbor = [draw_x, draw_y-1];
    var bottom_neighbor = [draw_x, draw_y+1];
    
    var neighbors = [left_neighbor, right_neighbor, top_neighbor, bottom_neighbor];//array med grannarnas koordinater

    //kolla om någon ska ombildas
    //en ruta ska ombildas om den är ett grundämne
    var transformations = [];
    for (var i = 0; i < neighbors.length; i++) {
      n_x = neighbors[i][0];
      n_y = neighbors[i][1];
      
      if(tiles[n_x] && tiles[n_x][n_y])
      {
        new_element = getNewElement(draw_element, tiles[n_x][n_y]);
        if(new_element != draw_element && transformations.indexOf(new_element) == -1)
            transformations.push(new_element);
        tiles[n_x][n_y] = new_element;
      }
    }
 
    console.log(transformations.length);
    //kolla om aktuell ruta ska ombildas eller tömmas
    //vi behöver veta vilka ombildningar som skett:
    //1. inga
    if(transformations.length == 0)
    {
      console.log("ingen trans!!!!")
      tiles[draw_x][draw_y] = draw_element;
    }
    //2. av en sort
    if(transformations.length == 1)
      tiles[draw_x][draw_y] = transformations[0];
    //3. av flera sorter
    if(transformations.length > 1)
      tiles[draw_x][draw_y] = "blank";

    console.log(data);

    //debug fulskriven för 3*3-bräda
    for (var i = 0; i < tiles.length; i++) {
      console.log(tiles[i][0] + " " + tiles[i][1] + " " + tiles[i][2]);
    }
    
    // Sends a message to all connected clients
    io.sockets.emit('transformBoard', data);

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
  }

  if(draw_element == "stone")
  {
    if(neighbor_element == "water")
      return "sand";
    if(neighbor_element == "grass")
      return "moss";
    if(neighbor_element == "fire")
      return "lava";
  }

  return neighbor_element;

}

		
		
	
