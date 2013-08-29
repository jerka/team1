
var Grid = 
{
	Rows : int,
	Cols : int
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
    ['Blank','Blank','Blank'],
    ['Blank','Blank','Blank'],
    ];
	},

	ConvertArrayToTileObjects : function()
	{
	var tiles = this.GetWorldFromServer();
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
	},	Render: function()
	{
		var t = this.ConvertArrayToTileObjects();
          for(var row=0; row<t.length; row++)
          {
            var tr = $('<tr></tr>')
            $("#grid table tbody").append(tr);
              
            for(var col=0; col<t[row].length;col++)
              {
                  var obj = t[row][col];
                 $(tr).append("<td>"+obj.type+"</td>");
             }

          }
	},




}