/**
 * -------------------------------------------------------------------
 *    ___   ___   ___   ___ ___                
 *   / __| /_\ \ / /_\ / __| __|               
 *   \__ \/ _ \ V / _ \ (_ | _|                
 *   |___/_/_\_\_/_/_\_\___|___| ___   ___ ___ 
 *   / __|/ _ \| __|_   _\ \    / /_\ | _ \ __|
 *   \__ \ (_) | _|  | |  \ \/\/ / _ \|   / _| 
 *   |___/\___/|_|   |_|   \_/\_/_/ \_\_|_\___|
 *
 * -------------------------------------------------------------------
 *    COPYRIGHT SAVAGESOFTWARE,LLC, @ 2022, ALL RIGHTS RESERVED
 *       https://github.com/SavageSoftware/portainer-backup
 * -------------------------------------------------------------------
 */

// import libraries
import Table  from 'cli-table3';
import figlet from 'figlet';
import colors from 'colors';
import prettyBytes from 'pretty-bytes';
import gradient from 'gradient-string';
import symbols from 'log-symbols';
import figures from 'figures';
import Util from './util.js'
import fs  from 'node:fs';
import {Portainer} from './portainer.js';

/**
 * This class is used to display/render much of the 
 * command line output used in this application.
 */
export class Render {
    
    /**
     * Default Constructor
     * @param {*} context the application context  
     */
    constructor(context) {
        this.context = context;        
    }

    /**
     * Display program title & header
     */
    title() {
        // display program title (using ASCII art)        
        this.writeln();
        this.writeln();
        this.writeln(gradient.cristal(figlet.textSync('Portainer Backup', {
            font: 'Small',
            horizontalLayout: 'default',
            verticalLayout: 'default',
            width: 80,
            whitespaceBreak: true
        })));

        // display header message
        var table = new Table({
            head: [{hAlign:'center', content: `Made with ${colors.bold.red(figures.heart)} by SavageSoftware, LLC © 2022    (Version ${this.context.version})`}],
            style:{head:['dim'],border:['dim']},
            wordWrap:false,
            colWidths:[66]    
        });
        this.writeln(table.toString());
        this.writeln();
    }

    /**
     * Display a table with current runtime configuration settings.
     * Different settings/option may be displayed based on the current 
     * operation (i.e. 'backup', 'restore' , 'schedule', etc.)
     */
    configuration(){

        // create and format a table to contaion configuration settings
        var table = new Table({
            //head: [{hAlign:'center', content: 'Configuration Setting'}, {hAlign:'center', content: 'Value'}],
            style:{head:['white'],border:[]},
            wordWrap:true,
            colWidths:[null,null]    
        });

        // include standard configuration elements
        table.push(
           [{colSpan:2,hAlign:'center',content: `${symbols.info} -- CONFIGURATION PROPERTIES -- ${symbols.info}`}],           
           ['PORTAINER_BACKUP_URL', this.context.config.portainer.baseUrl]
        );

        if(this.context.operation != "info"){
            table.push(['PORTAINER_BACKUP_TOKEN', this.context.config.portainer.token ? "*********************" : colors.red("!! MISSING !!")],);
            table.push(['PORTAINER_BACKUP_DIRECTORY', Util.wrapFilePath(this.context.config.backup.directory, 45)]);
            
            if(this.context.operation == "backup")
                table.push(['PORTAINER_BACKUP_FILENAME', this.context.config.backup.filename]);

            table.push(['PORTAINER_BACKUP_PASSWORD', this.context.config.backup.password ? "********" : colors.gray("(NONE)")]);    

            if(this.context.operation == "backup"){
                if(this.context.config.backup.stacks) 
                    table.push(['PORTAINER_BACKUP_STACKS', colors.green("ENABLED; stack files will be saved")]);
            }

            if(this.context.config.backup.overwrite) 
                table.push(['PORTAINER_BACKUP_OVERWRITE', colors.green("ENABLED; files will be overwritten as needed.")]);

            if(this.context.operation == "schedule")
                table.push(['PORTAINER_BACKUP_SCHEDULE', this.context.config.backup.schedule]);
        }

        // include optional configuration elements
        if(this.context.config.debug)  table.push(['PORTAINER_BACKUP_DEBUG', colors.green("ENABLED")]);
        if(this.context.config.dryRun) table.push(['PORTAINER_BACKUP_DRYRUN', colors.yellow("ENABLED; no files will be written.")]);

        // print the configuration table
        this.writeln(`The table below ${figures.triangleDown} lists the current runtime configuration settings:`)
        this.writeln();
        this.writeln(table.toString());
        this.writeln();
    }

    /**
     * Display a table with portainer server status information.
     */
    status(data){
        var table = new Table({ style:{head:[],border:[]} });
        table.push([{colSpan:2,hAlign:'center',content:`${symbols.info} -- PORTAINER SERVER -- ${symbols.info}`}]);
        table.push(['Portainer Version', data.Version],['Instance ID', data.InstanceID] );
        this.writeln(table.toString());
        this.writeln();
    }

    /**
     * Display a backup completed successfully message.
     */
    success(){
        var table = new Table({
            head: [symbols.success + ' PORTAINER BACKUP COMPLETED SUCCESSFULLY!'],
            style:{head:['brightGreen'],border:['brightGreen'], paddingLeft: 2, paddingRight: 2}
        });
        this.writeln(table.toString());
        this.writeln();
    }

    /**
     * Display a termination signal message.
     * @param {*} signal the signal detected causing the application to terminate.
     */
    terminate(signal){
        var table = new Table({
            head: [`${symbols.warning} TERMINATE SIGNAL DETECTED: ${colors.bgBlue.white.bold(" - " + signal + " - ")}`],
            style:{head:['brightYellow'],border:['brightYellow'], paddingLeft: 2, paddingRight: 2}
        });
        this.writeln();
        this.writeln(table.toString());
        this.writeln();
    }

    /**
     * Display an unsupported version message.
     * @param {*} version current version of connected portainer server.
     */
    unsupportedVersion(version){
        var table = new Table({
            head: [{colSpan: 2, content: `${symbols.warning} -- UNSUPPORTED PORTAINER VERSION -- ${symbols.warning}`}],
            style:{head:['brightYellow'],border:['brightYellow'], paddingLeft: 2, paddingRight: 2}
        });
        table.push([colors.yellow("PORTAINER VERSION"), colors.yellow(version)])
        table.push([colors.yellow("MINIMUM SUPPORTED VERSION"), colors.yellow(Portainer.MIN_VERSION)])
        this.writeln();
        this.writeln(table.toString());
        this.writeln();
    }

    /**
     * Display detials about the current backup file.
     * @param {*} file current backup file
     */
    backupFile(file){
        // display configuration settings
        var table = new Table({ 
            style:{head:[],border:[]}, wordWrap:true
        });

        // get file stats
        let stats = fs.statSync(file);

        // add table elements from response data and backup file
        table.push(
          [{colSpan:2,hAlign:'center',content:`${symbols.info} -- BACKUP FILE -- ${symbols.info}`}],
          ['PATH', Util.wrapFilePath(`${file}`, 55)],
          ['SIZE', prettyBytes(stats.size)],
          ['CREATED', stats.ctime.toString()],
          ['PROTECTED', this.context.config.backup.password ? "PROTECTED (with password)" : "NO PASSWORD"]
        );

        // print table to output stream
        this.writeln(table.toString());
        this.writeln();
    }

    /**
     * Display the number of stacks found in the stacks metadata/catalog.
     * @param {*} stacks an array of stack objects from the stacks metadata/catalog
     */
    stacksCount(stacks){
        // create table for stack count
        var table = new Table({
            head: [symbols.info + ` Acquired [${stacks.length}] stacks from portainer server!`],
            style:{head:[],border:['blue'], paddingLeft: 2, paddingRight: 2}
        });

        // print stacks count table
        this.writeln(table.toString());
        this.writeln();
    }

    /**
     * Display a table listing all the stack files.
     * @param {*} stacks an array of stack objects (including 'stack.file' references)
     */
    stackFiles(stacks){
        // create table for stack files listing
        let table = new Table({ style:{head:[],border:[]}, wordWrap:true });
        table.push([{colSpan:3,hAlign:'center',content:`${symbols.info} -- STACK FILES -- ${symbols.info}`}],
                   [ {hAlign:'center', content: "ID"}, {hAlign:'left', content: 'Name'}, {hAlign:'left', content: 'File'}]);

        // iterate stacks; append this stack info to the stack results table
        for(let index in stacks)
        {            
            let stack = stacks[index]; // reference stack instance
            table.push([stack.Id, stack.Name, Util.wrapFilePath(stack.file, 55)]);
        }        

        // print stack files table
        this.writeln(table.toString());
        this.writeln();
    }

    /**
     * Display a backup summary
     * @param {*} context 
     */
    summary(context){
        // create a summary table
        var table = new Table({ style:{head:[],border:[]}, wordWrap:true });
        table.push(
          [{colSpan:2,hAlign:'center',content:`${symbols.info} -- BACKUP SUMMARY -- ${symbols.info}`}],
          ['RESULT', (context.results.success)? colors.bold.green(`${symbols.success} SUCCCESS`) : colors.error(`${symbols.error} FAILED`) ]          
        );

        // add backup filename to summary table (if backup file exists)
        if(context.operation === "backup"){
            table.push(['BACKUP FILE', context.results.backup.filename]);
        }

        // add stacks count to summary table (if any exist)
        if(context.cache.stacks && context.cache.stacks.length > 0){
            table.push(['STACKS BACKED UP', `${context.cache.stacks.length} STACK FILES`]);
        }

        // add elapsed time to summary table
        table.push(['ELAPSED TIME', `${context.results.elapsed/1000} seconds`]);

        // print summary table to output stream
        this.writeln(table.toString());
        this.writeln();
    }

    /**
     * Display a "dry-run" warning message.
     */
    dryRun(){
        // create and display dry-run warning message table
        var table = new Table({
            head: [symbols.warning + ' This was a DRY-RUN; no backup files were saved.'],
            style:{head:['yellow'],border:['yellow'], paddingLeft: 2, paddingRight: 2}
        });
        this.writeln(table.toString());
        this.writeln();
    }

    /**
     * Display a goodbye message used with application is terminating.
     */
    goodbye(){
        this.writeln("-------- GOODBYE --------");
        this.writeln();
    }

    /**
     * Write/print the data parameter to output stream.
     * 
     * @param data optional string or object to print
     */
    write(data){
        if(data) this.context.output.stream.write(data.toString());
    }

    /**
     * Write/print the data parameter followed by a NEWLINE to output stream.
     * 
     * @param data optional string or object to print
     */
    writeln(data){
        if(data) this.context.output.stream.write(data.toString());
        this.context.output.stream.write("\n");
    }

    /**
     * Display error message and any additional error details.
     * 
     * @param {*} err Error error object
     * @param {*} message String error message
     * @param {*} note  String optional note
     */
    error(err, message, note){

        // display error message (if exists)
        if(message){
            var failTable = new Table({
                head: [symbols.error + ' ' + message],
                style:{head:[],border:['red'], paddingLeft: 2, paddingRight: 2},
            });
            this.writeln();
            this.writeln(failTable.toString());
            this.writeln();
        }

        // create error results table; err error object instance mesage
        var table = new Table({ 
            //head: [{hAlign:'center', content: "Results"}, {hAlign:'center', content: 'Value'}], 
            style:{head:['white'],border:['red']}, wordWrap:true, colWidths:[15,50] 
        });
        table.push([{colSpan:2,hAlign:'center', content: colors.bgRed.white(`${symbols.error} -------------------------- ERROR -------------------------- ${symbols.error}`)}]),
        table.push(['ERROR MESSAGE', err.message]);

        // display additional error context details
        if(err.response){
            // ALL 
            table.push(['API RESPONSE STATUS', colors.red(err.response.status + ` (${err.response.statusText})`)]);

            // 401
            if(err.response.status == 401)
                table.push(['NOTES', "Check your 'PORTAINER_BACKUP_TOKEN' to make sure it is valid and is assigned to a user with 'ADMIN' privileges."]);
        }

        // ERROR=ECONNRESET
        if(err.errno == -54)
            table.push(['NOTES', "Check your 'PORTAINER_BACKUP_URL'; unable to access portainer server via this URL."]);

        // add any optional notes
        if(note)
            table.push(['NOTES', note]);


        // display error results
        this.writeln(table.toString());
        this.writeln();
    }
}
