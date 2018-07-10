import fs = require('fs');
import streams = require('stream');
import blastmapLib = require('../index');
import jmClient  = require('ms-jobmanager');
import util = require('util');
import fastaLib = require('fasta-lib');

/*    
This test script takes a multiFasta
apply a blasttask to each fasta entry
*/

/*
Each fasta entry becomes a stream
A multifasta file becomes an iterable of streams
*/

let file = process.argv[2];

let myOptions = {
	'logLevel': 'debug'
};


let jobManager = jmClient.start({"TCPip": "localhost", "port": "2323"});

jobManager.on("ready", () => {
    let blastmapTask = new blastmapLib.blastmap({ "jobManager" : jmClient, "jobProfile" : "default" }, myOptions);
    blastmapTask.on('processed',(data)=>{
        console.log("****");
        console.log(`${util.inspect(data, {showHidden: false, depth: null})}`);
        process.exit();
    });
   
    fastaLib.parser(file).then((fastaObj) => {
        for (let fastaRecord of fastaObj) {
            console.log(fastaRecord.header);
        }
        fastaObj.setSlice(1, 1).setTag('inputMFasta').pipe(blastmapTask.inputMFasta);
    }).catch((e) => {
        console.log("Parsing error");
        console.log(e);
    });

    fs.readFile(file, 'utf8', function(err, data) {  
        if (err) throw err;
    
        let fContent:String = data.toString();
        let array = fContent.split("\n>");
        let inputStream = new streams.Readable();
        inputStream.push(JSON.stringify({ "inputMFasta" : array.slice(0, 10) }));
        inputStream.push(null);
        inputStream.pipe(blastmapTask.inputMFasta);

    });
});