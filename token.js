var tokenSource = "https://raw.githubusercontent.com/Cockatrice/Magic-Token/master/tokens.xml";
var tokensLoaded = false;
var tokens = {};

var transformSource = "https://api.scryfall.com/cards/search?order=cmc&q=is%3Aflip+or+is%3Adfc+or+is%3Aadventure";
var transformLoaded = false;
var transform = {};

function isValidLine(line)
{
	if(line.length==0) return false;
	if(line.match(/^#/gm)) return false;
	return true;
}

function clearLine(line)
{
	line = line.replace(/^\d+x/gm, ""); // Removes "2x"
	line = line.replace(/\(.*\)/gm, "");  // Removes "(SET")"
	line = line.replace(/\*\w+\*/gm, "");  // Removes "*F*"
	line = line.replace(/^\s+/gm, "");  // Trims leading space
	line = line.replace(/\s+$/gm, "");  // Trims trailing space
	return line;
}

function loadTokens(callback)
{
	console.log("LoadTokens called");

	if(tokensLoaded)
	{
		callback();
	}		
	else
	{
		$.get(tokenSource, null, function(data)
		{
			console.log("Data Load");
			
			var xml = $.parseXML(data);
			var cards = xml.getElementsByTagName("card");
			
			for(var i=0;i<cards.length;i++)
			{
				var token = { fullname: "", name: "", color: "", description: "", pt: "", cards: [] };
				for(var j=0;j<cards[i].childNodes.length;j++)
				{
					var nodeName = cards[i].childNodes[j].localName;
					if(nodeName=="name")
					{
						var cleanName = cards[i].childNodes[j].textContent;
						cleanName = cleanName.replace(/\s+$/gm, "");      // Cockatrice has strange trailing spaces in token names
						cleanName = cleanName.replace(/\(token\)/gm, ""); // Cockatrice has strange trailing spaces in token names
						
						if(cleanName.match(/\(emblem\)/gm))
						{
							cleanName = cleanName.replace(/\(emblem\)/gm, "");
							cleanName = "Emblem " + cleanName;
						}
						
						token.name = cleanName;
					}
					if(nodeName=="prop")
					{
						for(var k=0;k<cards[i].childNodes[j].childNodes.length;k++)
						{
							var propNodeName = cards[i].childNodes[j].childNodes[k].localName;
						
							if(propNodeName=="colors")
							{
								if(cards[i].childNodes[j].childNodes[k].textContent.match(/W/gm))
								{
									if(token.color!="") token.color = token.color + "/";
									token.color = token.color + "White";
								}
								if(cards[i].childNodes[j].childNodes[k].textContent.match(/U/gm))
								{
									if(token.color!="") token.color = token.color + "/";
									token.color = token.color + "Blue";
								}
								if(cards[i].childNodes[j].childNodes[k].textContent.match(/B/gm))
								{
									if(token.color!="") token.color = token.color + "/";
									token.color = token.color + "Black";
								}
								if(cards[i].childNodes[j].childNodes[k].textContent.match(/R/gm))
								{
									if(token.color!="") token.color = token.color + "/";
									token.color = token.color + "Red";
								}
								if(cards[i].childNodes[j].childNodes[k].textContent.match(/G/gm))
								{
									if(token.color!="") token.color = token.color + "/";
									token.color = token.color + "Green";
								}
								if(token.color=="") token.color = "Colorless";
								token.color = token.color;
							}
							if(propNodeName=="pt")
							{
								token.pt = cards[i].childNodes[j].childNodes[k].textContent;
							}
						}
					}

					if(nodeName=="text")
					{
						var cleanDescription = cards[i].childNodes[j].textContent;

						cleanDescription = cleanDescription.replace(/\)$/gm, "");
						cleanDescription = cleanDescription.replace(/^\(/gm, "");
						cleanDescription = cleanDescription.replace(/\r/gm, "");
						cleanDescription = cleanDescription.replace(/\n/gm, " ");
						
						token.description = cleanDescription;
					}

					if(nodeName=="reverse-related")
					{
						token.cards.push(cards[i].childNodes[j].textContent);
						
						if(cards[i].childNodes[j].textContent.includes(" // "))
						{
							var splitCards = cards[i].childNodes[j].textContent.split(" // ");
							
							for(var k=0;k<splitCards.length;k++)
							{
								token.cards.push(splitCards[k]);
							}
						}
					}
				}
				if(token.color=="") token.color = "Colorless";
				
				token.fullname = token.color + " " + token.name;
				if(token.pt!="") token.fullname = token.fullname + " " + token.pt;
				if(token.description!="" && !token.name.match(/^Emblem/gm)) token.fullname = token.fullname + " (" + token.description + ")";
				
				if(!token.name.match(/^\(/gm))
				{
					for(var j=0;j<token.cards.length;j++)
					{
						if(!tokens.hasOwnProperty(token.cards[j]))
						{
							tokens[token.cards[j]] = [];	
						}
						tokens[token.cards[j]].push(token.fullname);
					}
				}
			}
			
			tokensLoaded = true;
			callback();
		});
	}
}

function loadTransform(url, callback)
{
	console.log("LoadTransform called");
	
	if(transformLoaded)
	{
		callback();
	}		
	else
	{	$.get(url, null, function(data)
		{
			for(var i=0;i<data.data.length;i++)
			{
				transform[data.data[i].card_faces[0].name] = data.data[i].card_faces[1].name;
			}
			
			if(data.has_more)
			{
				loadTransform(data.next_page, callback);
			}
			else
			{
				transformLoaded = true;
				callback();
			}
		});
	}
}

function generate()
{
	$("#output").val("Loading...");
	
	loadTokens(function()
	{
		loadTransform(transformSource, generateTokens);
	});
}

function generateTokens()
{
	console.log("Generate called");
	
	var input = $("#input").val();
	var output = [];
	var lines = input.match(/[^\r\n]+/g);
	var validLines = [];

    if(lines==null)
    {
		$("#output").val("Card list is empty");
 		return;	
	}

	for(var i=0;i<lines.length;i++)
	{
		if(isValidLine(lines[i]))
		{
			var line = clearLine(lines[i]);
			validLines.push(line);
			if(transform.hasOwnProperty(line)) validLines.push(transform[line]);
		}			
	}
	
	for(var i=0;i<validLines.length;i++)
	{
		if(tokens.hasOwnProperty(validLines[i]))
		{
			for(var j=0;j<tokens[validLines[i]].length;j++)
			{
				output.push(tokens[validLines[i]][j]);
			}
		}
	}
	
	var output = Array.from(new Set(output)); // Filter unique items
	
	if(output.length==0)
	{
		$("#output").val("No tokens found for the specified card list");
	}
	else
	{
		$("#output").val(output.join("\n"));
	}
}
