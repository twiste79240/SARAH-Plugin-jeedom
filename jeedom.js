
/* This file is part of Jeedom.
 *
 * Jeedom is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Jeedom is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Jeedom. If not, see <http://www.gnu.org/licenses/>.
 */

 exports.action = function(data, callback, config, SARAH) {
    var debug = false;
	
	/************************************************
	** require list
	************************************************/
	var EventEmitter = require('events').EventEmitter;
	
	/************************************************
	** Path list
	************************************************/
	var pathXml = 'plugins/jeedom/jeedom.xml';
	//var pathJson = 'plugins/jeedom/jeedom.json';
	
	/************************************************
	** log method
	************************************************/
	var log = new EventEmitter();
	
    log.on('log', function(message) {
		console.log(message);
    });
	
    log.on('debugLog', function(message) {
		if (debug) {
			console.log(message);
		}
    });
	
	/************************************************
	** callbackReturn method
	************************************************/
	var callbackReturn = new EventEmitter();
	
    callbackReturn.on('tts', function(message) {
		log.emit('debugLog', '>> callbackReturn method "tts"');
		log.emit('log', message);
		callback({tts: message});
		log.emit('debugLog', '<< callbackReturn method "tts"');
    });
	
	/************************************************
	** interactionShortcut method
	************************************************/
	var interactionShortcut = new EventEmitter();
	
	interactionShortcut.on('detection', function(sentence) {
		log.emit('debugLog', '>> interactionShortcut method "detection"');
		
		interactionShortcut.emit('make');
		//callbackReturn.emit('tts', 'interactionShortcut method "detection" in progress');
		log.emit('debugLog', '<< interactionShortcut method "detection"');
	});
	
	interactionShortcut.on('make', function() {
		log.emit('debugLog', '>> interactionShortcut method "make"');
		interactionShortcut.emit('openFile');
	});
	
	interactionShortcut.on('openFile', function() {
		log.emit('debugLog', '>> interactionShortcut method "openFile"');
		var fs = require('fs');
		fs.readFile(pathXml, 'utf8', function(err, xml) {
			if (err) {
				log.emit('log', 'Reading file "' + pathXml + '" failed');
				log.emit('debugLog', err);
				callbackReturn.emit('tts', 'Making interaction for raspberry pi failed');
				log.emit('debugLog', '<< interactionShortcut method "make"');
			}
			else {
				log.emit('debugLog', 'Reading file "' + pathXml + '" succeed');
				log.emit('debugLog', xml);
				interactionShortcut.emit('convertXmlToJson', xml);
				log.emit('debugLog', '<< interactionShortcut method "openFile"');
			}
		});
	});
	
	interactionShortcut.on('convertXmlToJson', function(_xml) {
		log.emit('debugLog', '>> interactionShortcut method "convertXmlToJson"');
		
		var xml2jsStringParsor = require('xml2js').parseString;
		xml2jsStringParsor(_xml, function (err, json) {
			if ( err ) {
				log.emit('log', 'Conversion xml to json failed');
				log.emit('debugLog', err);
				callbackReturn.emit('tts', 'Conversion xml to json for raspberry pi failed');
				log.emit('debugLog', '<< interactionShortcut method "convertXmlToJson"');
			} else {
				log.emit('debugLog', 'Conversion xml to json for raspberry pi succeed');
				log.emit('debugLog', json);
				interactionShortcut.emit('extractionFromJson', json);
				log.emit('debugLog', '<< interactionShortcut method "convertXmlToJson"');
			}
		});
	});
	
	interactionShortcut.on('extractionFromJson', function(_json) {
		log.emit('debugLog', '>> interactionShortcut method "extractionFromJson"');
		
		function charFilter(_string) {
			_string = _string.toLowerCase();
			_string = _string.replace(/[èéêë]/g,"e");
			_string = _string.replace(/[ç]/g,"c");
			_string = _string.replace(/[à]/g,"e");
			return _string;
		}
		
		var interactionList = new Array();
		//Check all Sarah user
		for (sarahUser in _json.grammar.rule) {
			var key = _json.grammar.rule[sarahUser].item[0];
			var keyTab = charFilter(key);
			interactionList[keyTab] = new Array();
			
			for (interactionInfo in _json.grammar.rule[sarahUser]['one-of'][0].item) {
				var interactionTab = _json.grammar.rule[sarahUser]['one-of'][0].item[interactionInfo]['_'];
				interactionTab = charFilter(interactionTab);
				interactionList[keyTab][interactionTab] = new Array();
				
				var interactionTag = _json.grammar.rule[sarahUser]['one-of'][0].item[interactionInfo]['tag'][0];
				
				var interactionId = interactionTag.slice(0,interactionTag.search(';'));
				interactionId = interactionId.slice(interactionId.indexOf('"') + 1,interactionId.lastIndexOf('"'));
				interactionList[keyTab][interactionTab]['id'] = interactionId;
				
				var interactionMethod = interactionTag.slice(interactionTag.search(';') + 1);
				interactionMethod = interactionMethod.slice(interactionMethod.indexOf('"') + 1,interactionMethod.lastIndexOf('"'));
				interactionList[keyTab][interactionTab]['method'] = interactionMethod;
			}
		}
		log.emit('debugLog', interactionList);
		
		
		var tmp = 0;
		var nb = 0;
		var string = data.emulate;
		log.emit('debugLog', string);
		string = charFilter(string);
		log.emit('debugLog', string);
		
		for (key in interactionList) {
			tmp = string.search(key);
			
			if (tmp != -1) {
				for (sentence in interactionList[key]) {
					tmp = string.search(sentence);
					if (tmp != -1) {
						data.id = interactionList[key][sentence]['id'];
						data.method = interactionList[key][sentence]['method'];
						break;
					}
				}
			}
		}
		log.emit('debugLog', 'id --> ' + data.id);
		log.emit('debugLog', 'method --> ' + data.method);
		jeedomMethod.emit('execute', data.id);
		//interactionShortcut.emit('saveInteractionShortcut', interactionList);
		log.emit('debugLog', '<< interactionShortcut method "extractionFromJson"');
	});
	
	/*
	interactionShortcut.on('saveInteractionShortcut', function(_array) {
		log.emit('debugLog', '>> interactionShortcut method "saveInteractionShortcut"');
		
		interactionShortcut.emit('convertArrayToJson', _array);
		log.emit('debugLog', '<< interactionShortcut method "saveInteractionShortcut"');
	});
	
	interactionShortcut.on('convertArrayToJson', function(_array) {
		log.emit('debugLog', '>> interactionShortcut method "convertArrayToJson"');
		
		//***************************************************************************
		//My code *******************************************************************
		//***************************************************************************
		var myarray = [];
		var myJSON = "";
		for (var i in _array) {
			var item = {
				"value": i,
				"label": i
			};
			myarray.push(item);
		}
		myJSON = JSON.stringify({myarray: myarray});
		
		log.emit('debugLog', 'myJSON');
		log.emit('debugLog', myJSON);
		
		callbackReturn.emit('tts', 'interactionShortcut method "convertArrayToJson" in progress');
		//interactionShortcut.emit('writeFile', json);
		log.emit('debugLog', '<< interactionShortcut method "convertArrayToJson"');
	});
	
	interactionShortcut.on('writeFile', function(_json) {
		log.emit('debugLog', '>> interactionShortcut method "writeFile"');
		
        var fs = require('fs');
        fs.writeFile(pathJson, _json, function(err) {
            if (err) {
				log.emit('log', 'Writing file "' + pathJson + '" failed');
				log.emit('debugLog', err);
				callbackReturn.emit('tts', 'Making interaction for raspberry pi failed');
				log.emit('debugLog', '<< interactionShortcut method "writeFile"');
            } else {
				log.emit('debugLog', 'Writing file "' + pathJson + '" succeed');
				callbackReturn.emit('tts', 'Mise à jour du xml réussi');
				log.emit('debugLog', '<< interactionShortcut method "writeFile"');
            }
        });
	});
	*/
	
	/************************************************
	** jeedomMethod method
	************************************************/
	var jeedomMethod = new EventEmitter();
	
    jeedomMethod.on('execute', function(message) {
		log.emit('debugLog', '>> jeedomMethod method "execute"');
		log.emit('log', '--------Execute--------');
		var jsonrpc = generateJsonRpc();
		jsonrpc.method = 'execute';
		for (var i in data) {
			jsonrpc.params[i] = data[i];
		}
		sendJsonRequest.emit('start', jsonrpc, readReturn);
		log.emit('debugLog', '<< jeedomMethod method "execute"');
	});
	
    jeedomMethod.on('update', function(message) {
		log.emit('debugLog', '>> jeedomMethod method "update"');
		log.emit('log', '--------Update--------');
		var jsonrpc = generateJsonRpc();
		jsonrpc.method = 'updateXml';
		sendJsonRequest.emit('start', jsonrpc, updateXml);
		log.emit('debugLog', '<< jeedomMethod method "update"');
	});
	
	/************************************************
	** sendJsonRequest method
	************************************************/
	var sendJsonRequest = new EventEmitter();
	var pathJeedomApi = '/core/api/jeeApi.php';
	
    sendJsonRequest.on('start', function(_jsonrpc, intCallback) {
		log.emit('debugLog', '>> sendJsonRequest method "start"');
		
        var adresse = config.addrJeedom;
        if(adresse.indexOf('http://') < 0){
            adresse = 'http://' + adresse;
        }
        log.emit('log', 'Adresse : ' + adresse + pathJeedomApi);
        log.emit('debugLog', 'Request :');
        log.emit('debugLog', _jsonrpc);
        var request = require('request');
        request({
            url: adresse + pathJeedomApi,
            method: 'POST',
            form: {request: JSON.stringify(_jsonrpc)}
        },
        function(err, response, json) {
            if (err || response.statusCode != 200) {
				log.emit('log', 'Error: Callback request');
				log.emit('debugLog', err);
				log.emit('debugLog', response);
                processReturn(false, intCallback);
                return 0;
            }
            log.emit('log', '-------REQUEST RESULT-------');
            log.emit('log', json);
            log.emit('debugLog', '----------------------------');
            processReturn(JSON.parse(json), intCallback);
            return 0;
        });
		
		log.emit('debugLog', '<< sendJsonRequest method "start"');
	});
	
	/************************************************
	** function
	************************************************/
    function generateJsonRpc() {
        var jsonrpc = {};
        jsonrpc.id = data.id;
        jsonrpc.params = {};
        jsonrpc.params.apikey = config.apikeyJeedom;
        jsonrpc.params.plugin = 'sarah';
        jsonrpc.jsonrpc = '2.0';
        return jsonrpc;
    }
	
    function updateXml(_xml) {
        log.emit('log', 'Ecriture du fichier xml');
        var fs = require('fs');
        fs.writeFile(pathXml, _xml, function(err) {
            if (err) {
				log.emit('debugLog', 'Error: callback fs.writeFile')
				log.emit('debugLog', err)
				callbackReturn.emit('tts', err);
            } else {
				log.emit('log', 'Mise à jour du xml réussi');
				
				//for Raspberry pi
				//interactionShortcut.emit('make');
				callbackReturn.emit('tts', 'Mise à jour du xml réussi');
            }
        });
    }

    function readReturn(_return) {
		callbackReturn.emit('tts', _return);
    }

    function processReturn(_return, intCallback) {
		if (_return === false) {
			callbackReturn.emit('tts', 'Echec de la requete à jeedom (retour=faux)');
			log.emit('log', _return);
			return;
		}
		if (isset(_return.error)) {
			if (isset(_return.error.message)) {
				callbackReturn.emit('tts', _return.error.message);
			} else {
				callbackReturn.emit('tts', 'Echec de la requete à jeedom (no return message');
			}
		} else {
			log.emit('log', '-------REQUEST SUCCESS-------');
			intCallback(_return.result);
		}
	}
	
	function isset() {
		var a = arguments,
			l = a.length,
			i = 0,
			undef;
			
		if (l === 0) {
			throw new Error('Empty isset');
		}
		
		while (i !== l) {
			if (a[i] === undef || a[i] === null) {
				return false;
			}
			i++;
		}
		return true;
	}
	
	/************************************************
	** main
	************************************************/
	
	log.emit('log', 'Plugin "jeedom" for Sarah starting');
	
	config = config.modules.jeedom;
	
	//Start interaction
	
	log.emit('debugLog', data);
	//Detection raspberry pi mode
	if (data.emulate) {
		interactionShortcut.emit('detection', data.emulate);
		
	//PC mode
	//"execute" method detected
	} else if (data.method == 'execute') {
		jeedomMethod.emit('execute', data.id);
		
	//"update" method detected
	} else if (data.method == 'update') {
		jeedomMethod.emit('update');
		
	//Nope method detected
	} else {
		log.emit('log', 'Aucune méthode correspondance');
		callbackReturn.emit('tts', 'Aucune méthode correspondance');
	}
	
	
	
};
