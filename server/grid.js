
var Grid = 
{
  SearchPattern: [{ x: 0, y: 0},
                  { x: 0, y: -1},
                  { x: 1, y: 0},
                  { x: 0, y: 1},
                  { x: -1, y: 0}],
  
  CreateTile : function(_x,_y,_type)
  { 
    var tile = 
        {
          "x":_x,
          "y":_y,
          "type":_type           
        };
        return tile;
    
  },


  GetWorldFromServer : function()
  {
    return [
    ['blank','blank','blank'],
    ['blank','blank','blank'],
    ];
  },

  ConvertArrayToTileObjects : function(board)
  {
  var tiles = board != null ? board : this.GetWorldFromServer();
    var tilesToObjects = new Array();
    for (var i=0; i<tiles.length; i++)
    {
       var row = new Array();
      tilesToObjects.push(row);
     
  
      for(var j=0; j<tiles[i].length; j++)
      {
        row.push(this.CreateTile(j,i,tiles[i][j]));

      }
   }
  return tilesToObjects;
  },  Render: function(board, user)
  {
     $("#grid table tbody").html("");
    var t = this.ConvertArrayToTileObjects(board);
          for(var row=0; row<t.length; row++)
          {
            var tr = $('<tr></tr>')
            $("#grid table tbody").append(tr);
              
            for(var col=0; col<t[row].length;col++)
              {
                  var obj = t[row][col];
                  var isBlank = true;

                  if(obj.type != "blank")
                      isBlank = false;

                  if(user != null && user.lastMove != null) {
                    for(var i = 0; i < this.SearchPattern.length; i++) {
                      var possibleMove = this.SearchPattern[i];

                      if(user.lastMove.x + possibleMove.x == row && user.lastMove.y + possibleMove.y == col)
                        isBlank = false;
                    }
                  }

                  if(isBlank)
                    $(tr).append("<td class='blank'>"+obj.type+"</td>");
                  else
                    $(tr).append("<td style='width:80px;height:80px;background:url(\"assets/"+obj.type+".png\");''>"+obj.type+"</td>");
             }

          }
  }
};