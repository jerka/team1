var sio = require('socket.io');
var app = require('express')()
  , server = require('http').createServer(app)
  , io = sio.listen(server);

var fs = require('fs');

// Start listening on port 8080
//server.listen(10119);
server.listen(8080);


// Serve the index.html file
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

app.get('/grid.js', function (req, res) {
  res.sendfile(__dirname + '/grid.js');
});


app.get('/assets/sand.png', function (req, res) {
  res.sendfile(__dirname + '/assets/sand.png');
});

app.get('/assets/stone.png', function (req, res) {
  res.sendfile(__dirname + '/assets/stone.png');
});

app.get('/assets/flowers.png', function (req, res) {
  res.sendfile(__dirname + '/assets/flower.png');
});

app.get('/assets/blank.png', function (req, res) {
  res.sendfile(__dirname + '/assets/blank.png');
});

app.get('/assets/fire.png', function (req, res) {
  res.sendfile(__dirname + '/assets/fire.png');
});

app.get('/assets/water.png', function (req, res) {
  res.sendfile(__dirname + '/assets/water.png');
});

app.get('/assets/grass.png', function (req, res) {
    res.sendfile(__dirname + '/assets/grass.png');
});
app.get('/assets/lava.png', function (req, res) {
    res.sendfile(__dirname + '/assets/lava.png');
});
app.get('/assets/moss.png', function (req, res) {
    res.sendfile(__dirname + '/assets/moss.png');
});
app.get('/assets/ashes.png', function (req, res) {
    res.sendfile(__dirname + '/assets/ashes.png');
});
app.get('/assets/steam.png', function (req, res) {
    res.sendfile(__dirname + '/assets/steam.png');
});
  
app.get('/assets/night_back.jpg', function (req, res) {
  res.sendfile(__dirname + '/assets/night_back.jpg');
});

app.get('/assets/day_back.jpg', function (req, res) {
  res.sendfile(__dirname + '/assets/day_back.jpg');
});


app.get('/assets/strangeflower.png', function (req, res) {
  res.sendfile(__dirname + '/assets/awesomeflower.png');
});

app.get('/assets/sandfiregoddemon.png', function (req, res) {
  res.sendfile(__dirname + '/assets/firegoddemon.png');
});

app.get('/assets/mushroom.png', function (req, res) {
  res.sendfile(__dirname + '/assets/mushroom.png');
});

app.get('/assets/sandstorm.png', function (req, res) {
  res.sendfile(__dirname + '/assets/sandstorm.png');
});

app.get('/assets/fireflower.png', function (req, res) {
  res.sendfile(__dirname + '/assets/fireflower.png');
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

var _quests = ["sandfiregoddemon", "sandstorm", "fireflower", "strangeflower", "mushroom"];
var _gameHasStarted = false;
var _currentPlayer = null;
var _board = null;


function GetUserObject(id, userName) {
	return { id: id, userName: userName, quest: null, points: 0, lastMove: null };
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
      _currentPlayer.lastMove = data;

			var currentIndex = _playingUsers.indexOf(_currentPlayer);
			console.log("CurrentIndex", currentIndex);
			if(currentIndex == _playingUsers.length - 1) {
				_currentPlayer = _playingUsers[0];
			}
			else {
				_currentPlayer = _playingUsers[currentIndex+1];
			}

      transformBoard(data);

			io.sockets.emit('updateBoard', {board: _board });

      if(isGameOver()) {
        EndGame();
      }
      else {
        io.sockets.socket(_currentPlayer.id).emit("yourTurn", { user: _currentPlayer });
        io.sockets.emit('currentPlayer', {currentPlayer : _currentPlayer});
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

  var sortable = [];
  for(var u = 0; u<_playingUsers.length; u++)
  {
        var userPoints = _playingUsers[u].points;
        sortable.push({userName:_playingUsers[u].userName,points:userPoints}
        );

  }
  sortable.sort(function(a, b) {return a.points - b.points})
  
  io.sockets.emit('gameOver',{users:sortable.reverse()});
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

		CreateBoard(_playingUsers.length);
		
		UpdateQuests();
		
		io.sockets.emit('startGame', {message: "Game started", board: _board});
		io.sockets.socket(_currentPlayer.id).emit("yourTurn", { user: _currentPlayer });
    io.sockets.emit('currentPlayer', {currentPlayer : _currentPlayer});
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
   
    var draw_x = data.x;
    var draw_y = data.y;
    var draw_element = data.type;

    //denna läses upp ur nåt på servern
    var tiles = _board;

    console.log("Tiles: ", tiles);

    //leta upp alla grannar
    var left_neighbor = [draw_x-1, draw_y];
    var right_neighbor = [draw_x+1, draw_y];
    var top_neighbor = [draw_x, draw_y-1];
    var bottom_neighbor = [draw_x, draw_y+1];
    
    var neighbors = [left_neighbor, right_neighbor, top_neighbor, bottom_neighbor];//array med grannarnas koordinater

    //kolla om någon ska ombildas
    //en ruta ska ombildas om den är ett grundämne
    var transformations = [];
    var transformed_tiles = [];

    for (var i = 0; i < neighbors.length; i++) {
      n_x = neighbors[i][0];
      n_y = neighbors[i][1];
      
      if(tiles[n_x] && tiles[n_x][n_y])
      {
        if(tiles[n_x][n_y] != "blank")//en granne som är blank ska aldrig påverkas
        {
          //console.log("new elementar: ", draw_element,  tiles[n_x][n_y]);
          new_element = getNewElement(draw_element, tiles[n_x][n_y]);
          if(new_element != draw_element && new_element !=  tiles[n_x][n_y] && transformations.indexOf(new_element) == -1)
            transformations.push(new_element);
            
            if(tiles[n_x][n_y] != new_element)
              transformed_tiles.push([n_y, n_x]);

          tiles[n_x][n_y] = new_element;
          // transformed_tiles.push([n_x, n_y]);//transformed_tiles är en array med koordinater till tiles som transformerats
          
        }
      }
    }

 
    //console.log(transformations.length);
    //kolla om aktuell ruta ska ombildas eller tömmas
    //vi behöver veta vilka ombildningar som skett:
    //1. inga
    if(transformations.length == 0)
    {
    //  console.log("ingen trans!!!!")
      tiles[draw_x][draw_y] = draw_element;
    }
    //2. av en sort
    if(transformations.length == 1)
    {
      tiles[draw_x][draw_y] = transformations[0];
      transformed_tiles.push([draw_y, draw_x]);
    }
    //3. av flera sorter
    if(transformations.length > 1)
      tiles[draw_x][draw_y] = "blank";

//    console.log(data);

    //debug fulskriven för 3*3-bräda
    for (var i = 0; i < tiles.length; i++) {
    //  console.log(tiles[i][0] + " " + tiles[i][1] + " " + tiles[i][2]);
    }
    
    // Sends a message to all connected clients
    //io.sockets.emit('transformBoard', data);

    //console.log("After transform", tiles);

    console.log("transformed_tiles: ", transformed_tiles);

    //nu vill vi gå igenom alla transformerade tiles och se om de ska transformera några andra
    if(transformed_tiles.length>0)
      secondTransform(transformed_tiles, tiles);

    _board = tiles;
}


function secondTransform(transformed_tiles, tiles)
{
  //för varje transformerad tile vill vi hitta grannarna, och se om de ska transformeras en andra nivå
  //samt transformera den transformerade tilen om den ska det (dvs om den entydigt kan transformeras, annars stannar den i sitt tillstånd)
  //loopa igenom transformed_tiles, för varje ruta kolla grannar
  console.log("i secondtransform: ", transformed_tiles.length);

  var transformations_to_execute = [];

  for (var i = 0; i < transformed_tiles.length; i++) {
      //på radnivå
     console.log("undersöker ruta: ", transformed_tiles[i]);

      current_x = transformed_tiles[i][0];
      current_y = transformed_tiles[i][1];
      current_type = tiles[current_y][current_x];

      //nu har vi plockat ut data för en transformerad
      //nu vill vi kolla på grannarna
      //leta upp alla grannar
      var left_neighbor = [current_y, current_x-1];
      var right_neighbor = [current_y, current_x+1];
      var top_neighbor = [current_y-1, current_x];
      var bottom_neighbor = [current_y+1, current_x];
      
      var neighbors = [left_neighbor, right_neighbor, top_neighbor, bottom_neighbor];//array med grannarnas koordinater

       // console.log(neighbors);
        //kolla om någon ska ombildas
        //en ruta ska ombildas om den är ett grundämne
        var transformations = [];

        

        for (var j = 0; j < neighbors.length; j++) {

          n_x = neighbors[j][0];
          n_y = neighbors[j][1];
           
          if(tiles[n_x] && tiles[n_x][n_y])//kolla att vi inte hamnat utanför brädan
          {
            console.log("neighbor of transformed: ", tiles[n_x][n_y]);
            console.log("current: ", current_type);
            
            //vi skickar in current type och aktuell grannes type, och kör andranivåreglerna på dem
            var new_second_level = getSecondLevelElement(current_type, tiles[n_x][n_y]);

            if(new_second_level !=  tiles[n_x][n_y] && transformations.indexOf(new_second_level) == -1 && new_second_level != "smagga" && new_second_level != "dish")
              transformations.push(new_second_level);
            //obs både current och neighbor kan komma att ändras
            console.log(new_second_level);
            if(new_second_level != "smagga" && new_second_level != "dish")
            {
              console.log("pushar rutaz: ", n_y, n_x);
              transformations_to_execute.push([n_y, n_x, new_second_level]);
            }
          }//if

        }//for neighbors

        //här vill vi även second levla current OM exakt en secondlevling skett
          console.log("antal secondtransformationer: ", transformations.length, " ", transformations);
          //1. inga
          //if(transformations.length == 0)
          //{
            //tiles[draw_x][draw_y] = draw_element;
          //}
          //2. av en sort
          if(transformations.length == 1)
          {
            //tiles[n_x][n_y] = transformations[0];
            console.log("pushar ruta: ", current_x, current_y);
            transformations_to_execute.push([current_x, current_y, transformations[0]]);
          }
          //3. av flera sorter
          //if(transformations.length > 1)
        //tiles[draw_x][draw_y] = "blank";
    

    }//for transformed
    console.log("execute: ", transformations_to_execute);

    for(var k = 0; k<transformations_to_execute.length; k++)
    {
      var tile_y = transformations_to_execute[k][0];
      var tile_x = transformations_to_execute[k][1];
      var new_tile_element = transformations_to_execute[k][2];
      tiles[tile_x][tile_y] = new_tile_element;}
    
  }//secondtransform()

  function getSecondLevelElement(current_type, neighbor_type)
  {
    if(current_type == "sand")
    {
        if(neighbor_type == "lava")
          return "sandfiregoddemon";
        if(neighbor_type == "steam")
          return "sandstorm"
        return "smagga";
    }

    if(current_type == "lava")
    {
        if(neighbor_type == "sand")
          return "sandfiregoddemon";
        return "smagga";
    }

    if(current_type == "ashes")
    {
        if(neighbor_type == "flowers")
          return "fireflower";
        return "smagga";
    }

    if(current_type == "flowers")
    {
        if(neighbor_type == "ashes")
          return "fireflower";
        if(neighbor_type == "moss")
          return "strangeflower";
        return "smagga";
    }

    if(current_type == "moss")
    {
        if(neighbor_type == "steam")
          return "mushroom";
        if(neighbor_type == "flowers")
          return "strangeflower";
        return "smagga";
    }

    if(current_type == "steam")
    {
        if(neighbor_type == "moss")
          return "mushroom";
        if(neighbor_type == "sand")
          return "sandstorm";
        return "smagga";
    }

    return "dish";

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

function isGameOver() {
  for(var x = 0; x < _board.length; x++) {
    for(var y = 0; y < _board[x].length; y++) {
      if(_board[x][y] == "blank")
        return false;
    }
  }

  return true;
}

function CreateBoard(numberOfPlayers) {
  console.log("creating board");

  var rows = 2;
  var cols = 2;

  if(numberOfPlayers == 3) {
    rows = 5;
    cols = 5;
  }
  else if(numberOfPlayers == 4) {
    rows = 4;
    cols = 5;
  }
  else if(numberOfPlayers == 5) {
    rows = 10;
    cols = 15;
  }
  else if(numberOfPlayers == 6) {
    rows = 12;
    cols = 15;
  }
  else if(numberOfPlayers == 7) {
    rows = 14;
    cols = 15;
  }

  _board = [];

  for(var x = 0; x < rows; x++) {
    _board[x] = [];

    for(var y = 0; y < cols; y++) {
      _board[x][y] = "blank";
    }
  }

  console.log("board:", _board);
}
		
		
	
