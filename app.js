var GoogleSpreadsheets = require("google-spreadsheets");
var googleapis = require('googleapis');
var freebase = require('freebase');

var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/worldcup');

// spreadsheet with player data
var spreadsheet_id = "1_Rl2IXYokCdjG8yyLtZeAL1z8sB7fglxCL3VQKpZr4M";

var collection = db.get('players');
var number_players = 0;

var running = 0;
var limit = 4;

var spreadsheet_data;

function launcher(){
	while(running < limit && Object.keys(spreadsheet_data).length > 0) {
	
	var first_key = Object.keys(spreadsheet_data)[0];
	var row = spreadsheet_data[first_key];
	delete spreadsheet_data[first_key];

	getPlayerInfo(row, function(result) {
			
		// Insert to the DB
		collection.insert(result, function (err, doc) {
			if (err) {
				console.log("Problem occurred while trying to add data to database... Error: "+err.message); 
			}
		});
		
		running--;
		if(Object.keys(spreadsheet_data).length > 0) {
			launcher();
			} else if(running == 0) {
				finish();
			}
		});
	running++;
	} 
}


function loadSpreadsheet(){
	GoogleSpreadsheets({
		key: spreadsheet_id
	}, function(err, spreadsheet) {
		spreadsheet.worksheets[0].cells({
			range: "A2:I737"
		}, function(err, cells) {
			spreadsheet_data = cells['cells'];
			launcher();
		});
	}); 
}

function finish(){
	console.log("FINISHED IMPORTING DATA");
	process.exit(0);
}

function getPlayerInfo(row, callback){

	var insert_query;
							
	// get info about player from Freebase
	freebase.topic(row[1]['value'], {}, function (r) {
	
		insert_query = {						
			"player" : row[1]['value'],
			"position" : row[2]['value'],
			"number" : row[3]['value'],
			"club" : row[4]['value'],
			"nationality" : row[6]['value'],
			"birthday" : row[5]['value'],
			"caps" : row[7]['value'],
			"goals" : row[8]['value'],
			"plays_at_home" : row[9]['value']
		}
		
		console.log(r['property']['/common/topic/description']);
		
		var info, img, website, height, weight;

		try {
			info = r['property']['/common/topic/description']['values'][0]['value'];
			insert_query.info = info;
		} catch(e) {
			console.log("Cannot find description for player: "+row[1]['value']);
		}
		
		try {
			img = r['property']['/common/topic/image']['values'][0]['id'];
			insert_query.img = img;
		} catch(e) {
			console.log("Cannot find image for player: "+row[1]['value']);
		}
		
		try {
			website = r['property']['/common/topic/official_website']['values'][0]['value'];
			insert_query.website = website;
		} catch(e) {
			console.log("Cannot find website for player: "+row[1]['value']);
		}
		
		try {
			height = r['property']['/people/person/height_meters']['values'][0]['value'];
			insert_query.height = height;
		} catch(e) {
			console.log("Cannot find height for player: "+row[1]['value']);
		}	
		
		try {
			weight = r['property']['/people/person/weight_kg']['values'][0]['value'];
			insert_query.weight = weight;
		} catch(e) {
			console.log("Cannot find weight for player: "+row[1]['value']);
		}
		
	});
	
	setTimeout(function() { callback(insert_query); }, 1000);
}

loadSpreadsheet();