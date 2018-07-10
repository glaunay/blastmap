import tk = require('taskobject');
import blastLib = require('blasttask');
import typ = require('taskobject/ts/src/types/index');

import streams = require('stream');
import util = require('util');
declare var __dirname;

/* interface */
let defaultBlastTaskOptions = {
	'logLevel': 'debug',
    'modules' : ['ncbi-blast/2.2.26','blastXMLtoJSON'],
    'exportVar' : { 'dbPath' : 'nr70',
                    'eValue' : '0.1',
                    'nbIter' : '1',
                    'maxSeq' : '50'}
};

/*
    A task to apply a serie of blast to an iterable input
*/
export class blastmap extends tk.Task {
    public readonly inputMFasta;
    constructor(management:{}, options?:any) {
        super(management, options); // (1)
        
        //this.setAsMapOnly();// = true;
        // SWITCH from classical run to a run taht does not 
        this.isMap = true;
        this.rootdir = __dirname; // (2)
        this.coreScript = this.rootdir + '/../data/coreScript.sh'; // (3)
        this.slotSymbols = ['inputMFasta']; // (4)
        super.initSlots(); // (5)
    }
    prepareJob (inputs) {// inputs is meant to be iterable
        let value:typ.stringMap;
        for (let iSlot of inputs) { // inputs = [{slotSymbol: inputValueAsContainer|String }, ...., {}]
            if( !iSlot.hasOwnProperty('inputMFasta') ) continue;
            value = iSlot.inputMFasta; // Value is a data container
            console.dir(value);
            console.log('**' + typeof(value));

            
            /*
        1/ Async resolution of mutliple task creation (Promise.all)
        2/ upon completion => 
            this.goReading = true;
            STUFF = {[this.outKey] : realSTUFF }
            this.push(JSON.stringify(STUFF))  => Stream to next task
            this.emit("processed", STUFF)  => show STUFF 

            taskobject index.tx:289 is the call
            */

            let taskArray:Promise<String>[] = [];
            for (let key in value) {
                let d:any = value[key];
                let p:Promise<string> = new Promise( (resolve, reject)=> {
                    let task = new blastLib.blasttask({ "jobManager" : this.jobManager, "jobProfile" : "default" }, defaultBlastTaskOptions);
                    task.on("processed", (taskOutput:string)=>{
                        console.log(`OOOO=======\n${ util.inspect(taskOutput, {showHidden: false, depth: null}) }`);
                        resolve(taskOutput);
                    });
                    console.log(`passing ${d.toString()} to atomic blast task`);
                    let container = { "inputF": d.toString() };
                    let fastaStream = new streams.Readable();
                    fastaStream.push(JSON.stringify(container));
                    fastaStream.push(null);
                    //console.dir(util.inspect(task));
                    fastaStream.pipe(task.inputF);
                });
                taskArray.push(p);
            }
            Promise.all(taskArray).then((results:string[])=>{                
                this.prepareResults(results);
            });
        }
       // mFastaToStreamsArray(value).forEach(iStream:streams.Rea)
        return super.configJob(inputs);
    }

    // Same function name but not same calling context
    prepareResults (resultLitt) { // from JSON.parse(pushedJob.stdout)
        this.goReading = true;
        let output :{ } =  { [this.outKey] : resultLitt };
        this.push(JSON.stringify(output)); // pushing string = activate the "_read" method
        this.emit('processed', output);
    }
}
