"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tk = require("taskobject");
const blastLib = require("blasttask");
const streams = require("stream");
const util = require("util");
/* interface */
let defaultBlastTaskOptions = {
    'logLevel': 'debug',
    'modules': ['ncbi-blast/2.2.26', 'blastXMLtoJSON'],
    'exportVar': { 'dbPath': 'nr70',
        'eValue': '0.1',
        'nbIter': '1',
        'maxSeq': '50' }
};
/*
    A task to apply a serie of blast to an iterable input
*/
class blastmap extends tk.Task {
    constructor(management, options) {
        super(management, options); // (1)
        //this.setAsMapOnly();// = true;
        // SWITCH from classical run to a run taht does not 
        this.isMap = true;
        this.rootdir = __dirname; // (2)
        this.coreScript = this.rootdir + '/../data/coreScript.sh'; // (3)
        this.slotSymbols = ['inputMFasta']; // (4)
        super.initSlots(); // (5)
    }
    prepareJob(inputs) {
        let value;
        for (let iSlot of inputs) {
            if (!iSlot.hasOwnProperty('inputMFasta'))
                continue;
            value = iSlot.inputMFasta; // Value is a data container
            console.dir(value);
            console.log('**' + typeof (value));
            /*
        1/ Async resolution of mutliple task creation (Promise.all)
        2/ upon completion =>
            this.goReading = true;
            STUFF = {[this.outKey] : realSTUFF }
            this.push(JSON.stringify(STUFF))  => Stream to next task
            this.emit("processed", STUFF)  => show STUFF

            taskobject index.tx:289 is the call
            */
            let taskArray = [];
            for (let key in value) {
                let d = value[key];
                let p = new Promise((resolve, reject) => {
                    let task = new blastLib.blasttask({ "jobManager": this.jobManager, "jobProfile": "default" }, defaultBlastTaskOptions);
                    task.on("processed", (taskOutput) => {
                        console.log(`OOOO=======\n${util.inspect(taskOutput, { showHidden: false, depth: null })}`);
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
            Promise.all(taskArray).then((results) => {
                this.prepareResults(results);
            });
        }
        // mFastaToStreamsArray(value).forEach(iStream:streams.Rea)
        return super.configJob(inputs);
    }
    // Same function name but not same calling context
    prepareResults(resultLitt) {
        this.goReading = true;
        let output = { [this.outKey]: resultLitt };
        this.push(JSON.stringify(output)); // pushing string = activate the "_read" method
        this.emit('processed', output);
    }
}
exports.blastmap = blastmap;
