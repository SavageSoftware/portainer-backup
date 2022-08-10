#!/usr/bin/env node

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
import fs  from 'node:fs';
import path from 'node:path';
import symbols from 'log-symbols';
import sanitize from 'sanitize-filename';
import figures from 'figures';
import {Portainer} from './portainer.js';
import {Render} from './render.js';
import Util from './util.js';
import {Configuration} from './configuration.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import DevNull from 'dev-null';
import cron from 'node-cron'
import { compareSemVer, isValidSemVer, parseSemVer } from 'semver-parser';
import ON_DEATH from 'death';
import { createRequire } from 'module';

// use the require approach to obtain package.json
const require = createRequire(import.meta.url);
const pkg = require('../package.json');

// create deafult context
let context = {
    version: pkg.version,
    output: {
        stream: process.stdout
    },
    cache: {
        args: undefined,
        stacks: []
    },    
    operation: "backup",
    config: new Configuration(),
    results: {
        success: false,
        started: undefined,
        finished: undefined,
        elapsed: undefined,
        backup: undefined,
        portainer: undefined,
        stacks: undefined,
        error: undefined
    }   
};

// create rendering utility and pass in STDOUT stream via constructor
let render = new Render(context);

// create portainer instance; pass in config via constructor
let portainer = new Portainer(context);

// listen for signals to terminate the process 
// and handle any uncaught exceptions in the process
ON_DEATH({
    debug: false,
    uncaughtException: true,
    SIGINT: true,
    SIGTERM: true,
    SIGQUIT: true,
    SIGABRT: true,
    SIGILL: true
})(function(signal, err) {    
    if(err && err.message){
        render.writeln();
        render.error(err);
        console.error(err);
    }
    render.terminate(signal);
    render.goodbye();
    process.exit(0);
});

// run a first pass on command line argument only looking for "--quiet" or "--json"
// this is done to supress console output for these options
let initArgs = yargs(hideBin(process.argv))
  // optional argument : portainer server access token (PORTAINER_BACKUP_TOKEN)
  .boolean("q")
  .alias("q", "quiet")
  .help(false)
  .boolean("J")
  .alias("J", "json")
  .parse();

// handle '--quiet' and '--json' option; set output stream to null device
if(initArgs.quiet || initArgs.json) context.output.stream = new DevNull();

// display program title (using ASCII art)
render.title();

// parse full set of command line arguments
yargs(hideBin(process.argv))

  // intercept arguments for additional processing before executing any commands
  .middleware(function (argv) {      
      context.cache.args = argv;            // cache command line arguments
      context.operation = argv['_'][0];     // set context operation reference 
      context.results.started = new Date(); // record start timestamp
      context.config.process(argv);         // process the arguments for configuration
  }, false)

  // usage description (one command is required, options are optional)
  .usage('Usage: <command> [(options...)]')

  // command example syntax
  .epilog("Command Examples:")
  .epilog('  info     --url http://192.168.1.100:9000\n')
  .epilog('  backup   --url http://192.168.1.100:9000\n           --token XXXXXXXXXXXXXXXX\n           --overwrite\n           --stacks\n')
  .epilog('  stacks   --url http://192.168.1.100:9000\n           --token XXXXXXXXXXXXXXXX\n           --overwrite\n')
  .epilog('  restore  --url http://192.168.1.100:9000\n           --token XXXXXXXXXXXXXXXX\n           ./file-to-restore.tar.gz\n')
  .epilog('  schedule --url http://192.168.1.100:9000\n           --token XXXXXXXXXXXXXXXX\n           --schedule "0 0 0 * * *"\n')

  // schedule cron expression syntax
  .epilog("Schedule Expression Examples: (cron syntax)")
  .epilog("                                     ")
  .epilog("    ┌──────────────────────── second (optional)")
  .epilog("    │   ┌──────────────────── minute           ")
  .epilog("    │   │   ┌──────────────── hour             ")
  .epilog("    │   │   │   ┌──────────── day of month     ")
  .epilog("    │   │   │   │   ┌──────── month            ")
  .epilog("    │   │   │   │   │   ┌──── day of week      ")
  .epilog("    │   │   │   │   │   │                      ")
  .epilog("    │   │   │   │   │   │                      ")
  .epilog("    *   *   *   *   *   *                      ")
  .epilog("                                               ")
  .epilog("    0   0   0   *   *   *   Daily at 12:00am   ")
  .epilog("    0   0   5   1   *   *   1st day of month @ 5:00am")
  .epilog("    0 */15  0   *   *   *   Every 15 minutes   ")
  .epilog("                                               ")
  .epilog("    Additional Examples @ https://github.com/node-cron/node-cron#cron-syntax")
  .epilog("                                               ")
  .epilog('-------------------------------------------------------------------------------')
  .epilog('    MORE DETAILS @       https://github.com/SavageSoftware/portainer-backup    ')  
  .epilog('-------------------------------------------------------------------------------')

  // we will handle this extraction/interpretation of envrionment variables process 
  // manually to be more flexible with accepting values as well as to include 
  // the envrionment variable values as the default in the CLI help
  // .env("PORTAINER_BACKUP")  

  // perform a backup of the portainer data and optionally stack files
  .command('backup', 'Backup portainer data', () => {}, (argv) => {
    backup();
  })

  // perform scheduled backups of the portainer data and optionally stack files
  .command('schedule', 'Run scheduled portainer backups', () => {}, (argv) => {
    schedule();
  })

  // perform a backup of the portainer stack files only
  .command('stacks', 'Backup portainer stacks', () => {}, (argv) => {
    stacks();
  })

  // display information about the connected portainer server
  .command('info', 'Get portainer server info', () => {}, (argv) => {      
    info();
  })

  // perform a test backup of the portainer data and optionally stack files
  // no files will be written; this is the same as using the '--dryrun' option 
  // with the backup task
  .command('test', "Test backup data & stacks (backup --dryrun --stacks)", () => {}, (argv) => {
    context.config.dryRun = true; // TEST==DRY-RUN
    backup();
  })

  // restore a previous backup file to a new portainer server
  .command('restore <filename>', 'Restore portainer data', () => {}, (argv) => {
    restore();
  })

  // display command line help
  .command('help', 'Show help', () => {}, (argv) => {
    yargs.showHelp();
  })

  // display application versoin
  .command('version', 'Show version', () => {}, (argv) => {
    render.writeln(pkg.version);
  })

  // help command alias
  .help("h")
  .alias('h', 'help') 

  // application version alias
  .alias('v', 'version')   

  // optional argument : supress command line output (PORTAINER_BACKUP_QUIET)
  .options({
    'q': {
      alias: ['quiet'],
      default: context.config.quiet,
      describe: 'Do not display any console output',
      type: 'boolean',
    }
  })

  // optional argument : if enabled, the 'backup' or 'stacks' operation 
  // will not write any data to the filesystem. (PORTAINER_BACKUP_DRYRUN)
  .options({
    'D': {
      alias: 'dryrun',
      default: context.config.dryRun,
      describe: 'Execute command task without persisting any data.',
      type: 'boolean'
    }
  })

  // optional argument : if enabled, and an error is encountered, the complete
  // stack trace will be printed to the console (PORTAINER_BACKUP_DEBUG)
  .options({
    'X': {
      alias: 'debug',
      default: context.config.debug,
      describe: 'Print details stack trace for any errors encountered',
      type: 'boolean'
    }
  })

  // optional argument : if enabled, output JSON formatted structured data
  // instead of human readable output. (PORTAINER_BACKUP_JSON)
  .options({
    'J': {
      alias: 'json',
      default: context.config.json,
      describe: 'Print formatted/strucutred JSON data',
      type: 'boolean'
    }
  })

  // optional argument : if enabled, output human readable information
  // to the console but in a more compact/concise format. (PORTAINER_BACKUP_CONCISE)
  .options({
    'c': {
      alias: 'concise',
      default: context.config.concise,
      describe: 'Print concise/limited output',
      type: 'boolean'
    }
  })

  // optional argument : allow bypassing portainer version enforcement (PORTAINER_BACKUP_IGNORE_VERSION)
  .options({
    'Z': {
      alias: 'ignore-version',
      default: context.config.portainer.ignoreVersion,
      describe: 'Bypass portainer version check/enforcement',
      type: 'boolean'
    }
  })

  // optional argument : portainer server access token (PORTAINER_BACKUP_TOKEN)
  .options({
    't': {
      alias: ['token'],
      default: context.config.portainer.token,
      describe: 'Portainer access token',
      type: 'string',
      requiresArg: true,
      nargs: 1
    }
  })

  // optional argument : portainer server base URL (PORTAINER_BACKUP_URL)
  .options({
    'u': {
      alias: ['url'],
      default: context.config.portainer.baseUrl,
      describe: 'Portainer base url',
      type: 'string',
      requiresArg: true,
      nargs: 1
    }
  })

  // optional argument : directory to write backup files to (PORTAINER_BACKUP_DIRECTORY)
  .options({
    'd': {
      alias: ['directory', 'dir'],
      default: context.config.backup.directory,
      describe: 'Backup directory/path',
      type: 'string',
      requiresArg: true,
      nargs: 1,
      normalize: true
    }
  })

  // optional argument : filename of data archive file to write
  // backup to inside backup directory (PORTAINER_BACKUP_FILENAME)
  .options({
    'f': {
      alias: 'filename',
      default: context.config.backup.filename,
      describe: 'Backup filename',
      type: 'string',
      requiresArg: true,
      nargs: 1,
      normalize: true
    }
  })

  // optional argument : password to use to protect backup archive file (PORTAINER_BACKUP_PASSWORD)
  .options({
    'p': {
      alias: ['password', 'pwd'],
      default: context.config.backup.password,
      describe: 'Backup archive password',
      type: 'string',
      requiresArg: true,
      nargs: 1
    }
  })

  // optional argument : allow overwritting of existing backup
  // data and stack file with same name (PORTAINER_BACKUP_OVERWRITE)
  .options({
    'o': {
      alias: 'overwrite',
      default: context.config.backup.overwrite,
      describe: 'Overwrite existing files',
      type: 'boolean'
    }
  })

  // optional argument : include stack files in addition to backup 
  // data archive file in a 'backup' opertation (PORTAINER_BACKUP_STACKS)
  .options({
    'i': {
      alias: ['include-stacks','stacks',],
      default: context.config.backup.stacks,
      describe: 'Include stack files in backup',
      type: 'boolean'
    }
  })

  // optional argument : include stack files in addition to backup 
  // data archive file in a 'backup' opertation (PORTAINER_BACKUP_STACKS)
  .options({
    'M': {
      alias: ['mkdir','make-directory',],
      default: context.config.backup.stacks,
      describe: 'Create backup directory path if needed',
      type: 'boolean'
    }
  })

  // optional argument : the cron-like expression for scheduling 
  // automated 'backup' opertations (PORTAINER_BACKUP_SCHEDULE)
  .options({
    's': {
      alias: ['schedule', 'sch'],
      default: context.config.backup.schedule,
      describe: 'Cron expression for scheduled backups',
      type: 'string',
      requiresArg: true,
      nargs: 1
    }
  })

   // setup option groups
  .group(['t','u', 'Z'], 'Portainer Options:')
  .group(['d','f','p','o','M','s','i'], "Backup Options:  (applies only to 'backup' command)")
  .group(['d','o','M'], "Stacks Options:  (applies only to 'stacks' command)")
  .group(['p'], "Restore Options:  (applies only to 'restore' command)")

  // we always require a single command operation
  .demandCommand(1, "ATTENTION: You must provide at least one command: [backup, stacks, restore, info, test, schedule]\n")
  .strictCommands() 
  .strictOptions()
  .parse();


// ********************************************************************************************************
// ********************************************************************************************************
//                                             TASKS/OPERATIONS
// ********************************************************************************************************
// ********************************************************************************************************

/**
 * EXECUTE TASK: [SCHEDULE]
 */
function schedule(){

    // display runtime configuration settings
    if(!context.config.concise) render.configuration();

    // the following promise chain is responsible for 
    // performing the complete backup workflow sequence.    
    initialize(context)                                     // initialize operation
        .then((ctx)=>{
            return portainerStatusCheck(context)            // check for access to portainer API/server
        })
        .then((ctx)=>{
            return validatePortainerVersion(context);       // perform portainer version check
        }) 
        .then((ctx)=>{
            return validateAccessToken(context);            // perform portainer access token check
        })                    
        .then((ctx)=>{
            return validateSchedule(context);
        })
        .then((ctx)=>{
            cron.schedule(context.config.backup.schedule, function() {
                console.log('----------------------------------------------------------------------');
                console.log(`[${new Date().toISOString()}] ... Running Scheduled Backup`);
                console.log('----------------------------------------------------------------------');
                console.log();

                validateBackupDirectory(context)                      // validate backup directory/path
                    .then(()=>{
                        return validateBackupFile(context)            // validate backup file
                    })
                    .then(()=>{
                        return portainerBackupData(context)           // perform portainer data backup 
                    })
                    .then((ctx)=>{
                        if(context.config.backup.stacks) 
                            return portainerBackupStacks(context);    // perform portainer stacks backup (if needed)
                    }) 
                    .then((ctx)=>{        
                        finish();
                        if(!context.config.concise) 
                            render.summary(context);                  // display backup summary
                        })    
                    .then((ctx)=>{
                        if(context.config.dryRun) render.dryRun();    // display DRY-RUN message (if needed)
                    })    
                    .then((ctx)=>{
                        if(!context.config.concise) 
                            render.success();                         // display backup complete message
                        })    
                    .catch((err)=>{     
                        if(context.config.debug) console.error(err);  // debug ouput message (if needed)
                    })
                    .finally(() => {                                // finished
                        console.log('----------------------------------------------------------------------');
                        console.log(`[${new Date().toISOString()}] ... Waiting for next scheduled backup`);
                        console.log('----------------------------------------------------------------------');
                        console.log();
                    });        
            });
        })
        .catch((err)=>{     
            finish(err);
            if(context.config.debug) console.error(err);    // debug error message (if needed)
            render.goodbye();                               // goodbye message        
            process.exit(context.results.success ? 0 : 1);  // exit the running process
        })        
        .finally(() => {
            console.log();
            console.log('----------------------------------------------------------------------');
            console.log(`[${new Date().toISOString()}] ... Waiting for next scheduled backup`);
            console.log('----------------------------------------------------------------------');
            console.log();
        });
}

/**
 * EXECUTE TASK: [BACKUP]
 */
function backup(){

    // display runtime configuration settings
    if(!context.config.concise) render.configuration();

    // the following promise chain is responsible for 
    // performing the complete backup workflow sequence.
    initialize(context)                                     // initialize operation
        .then(()=>{
            return validateBackupDirectory(context);        // validate backup directory/path
        })
        .then(()=>{
            return validateBackupFile(context)              // validate backup file
        })
        .then((ctx)=>{
            return portainerStatusCheck(context)            // check for access to portainer API/server
        })
        .then((ctx)=>{
            return validatePortainerVersion(context);       // perform portainer version check
        }) 
        .then((ctx)=>{
            return validateAccessToken(context);            // perform portainer access token check
        })            
        .then((ctx)=>{
            return portainerBackupData(context);            // perform portainer data backup 
        })    
        .then((ctx)=>{
            if(context.config.backup.stacks) 
                return portainerBackupStacks(context);      // perform portainer stacks backup (if needed)
        }) 
        .then((ctx)=>{        
            finish();
            if(!context.config.concise) 
                render.summary(context);                    // display backup summary
        })    
        .then((ctx)=>{
            if(context.config.dryRun) render.dryRun();      // display DRY-RUN message (if needed)
        })    
        .then((ctx)=>{
            if(!context.config.concise) 
                render.success();                           // display backup complete message
        })    
        .catch((err)=>{     
            finish(err);
            if(context.config.debug) console.error(err);    // debug error message (if needed)
        })
        .finally(() => {                                    // finished
            render.goodbye();                               // goodbye message        
            process.exit(context.results.success ? 0 : 1);  // exit the running process
        });
}


/**
 * EXECUTE TASK: [STACKS]
 */
function stacks(){

    // display runtime configuration settings
    if(!context.config.concise) render.configuration();

    // the following promise chain is responsible for 
    // performing the complete [STACKS] workflow sequence.
    initialize(context)                                     // initialize operation
        .then(()=>{
            return validateBackupDirectory(context);        // validate backup directory/path
        })
        .then((ctx)=>{
            return portainerStatusCheck(context)            // check for access to portainer API/server
        })
        .then((ctx)=>{
            return validatePortainerVersion(context);       // perform portainer version check
        })            
        .then((ctx)=>{
            return validateAccessToken(context);            // perform portainer access token check
        })            
        .then((ctx)=>{
            return portainerBackupStacks(context);          // perform portainer stacks backup
        }) 
        .then((ctx)=>{        
            finish();
            if(!context.config.concise) 
                render.summary(context);                    // display backup summary
        })    
        .then((ctx)=>{
            if(context.config.dryRun) render.dryRun();      // display DRY-RUN message (if needed)
        })    
        .then((ctx)=>{            
            if(!context.config.concise) 
                render.success();                           // display backup complete message
        })
        .catch((err)=>{     
            finish(err);
            if(context.config.debug) console.error(err);    // debug error message (if needed)
        })
        .finally(() => {                                    // finished
            render.goodbye();                               // goodbye message        
            process.exit(context.results.success ? 0 : 1);  // exit the running process
        });
}


/**
 * EXECUTE TASK: [INFO]
 */
function info(){

    // display runtime configuration settings
    if(!context.config.concise) render.configuration();

    // the following promise chain is responsible for 
    // performing the complete [INFO] workflow sequence.
    initialize(context)                                    // initialize operation
        .then(()=>{
            return portainerStatusCheck(context);          // validate configuration and runtime environment
        })
        .then((ctx)=>{
            return validatePortainerVersion(context);      // perform portainer version check
        })            
        .then(()=>{
            finish();            
        })
        .catch((err)=>{     
            finish(err);
            if(context.config.debug) console.error(err);    // debug error message (if needed)            
        })
        .finally(() => {                                    // finished
            render.goodbye();                               // goodbye message        
            process.exit(context.results.success ? 0 : 1);  // exit the running process
        });
}


/**
 * EXECUTE TASK: [RESTORE]   <---- NOT YET SUPPORTED
 */
 function restore(){
    let err = new Error("The 'restore' method has not yet been implemented.");
    render.error(err, null, "The portainer API for restoring backups has a flaw preveting uploading restore files at this time.");    
    finish(err);
    process.exit(1); // exit with error code
}


// ********************************************************************************************************
// ********************************************************************************************************
//                                             HELPER METHODS
// ********************************************************************************************************
// ********************************************************************************************************

/**
 * This method is called when either a [backup] or [stacks] task/operation has completed 
 * and we need to finalize the results data and calaulate the operation elapsed time.
 * 
 * This method is also responsible for printing JSON formatted ouptut when a task
 * is complete if the process has been configured to do so.
 * 
 * @param {*} err optional error object instance | null 
 */
function finish(err){

    // record finished timestamp
    context.results.finished = new Date();

    // update results object with elapsed duration, success and eny errors
    context.results.elapsed = context.results.finished - context.results.started; 
    context.results.success = (err) ? false : true;
    if(err){
        context.results.error = {
            message: err.message,
            number: err.errno
        }
    }

    // optionally print JSON data to output stream
    if(context.config.json){
        process.stdout.write(JSON.stringify(context.results, null, 2));
        process.stdout.write("\n");    
    }
}


/**
 * Validate configuration settings and environment conditions for backup 
 * @param {*} context application context 
 * @returns Promise
 */
 function initialize(context){
    return new Promise((resolve, reject) => {

        try{
            // initialize operation
            render.write("Initializing operation             : ");
            
            // copy backup info in results data
            context.results.backup = {
                directory: context.config.backup.directory,
                filename: context.config.backup.filename,
                protected: (context.config.backup.password) ? true : false,
                status: "pending"
            }

            // success
            render.writeln(`${symbols.success} ${context.operation.toUpperCase()}`);
            return resolve(context);
        }
        catch(err){
            render.writeln(`${symbols.error} ${context.operation.toUpperCase()}`);
            render.error(err, "Failed to initialize operation!");    
            return reject(err);
        }
    });
}



// ********************************************************************************************************
// ********************************************************************************************************
//                                            VALIDATION METHODS
// ********************************************************************************************************
// ********************************************************************************************************

/**
 * Validate the schedule (cron-like) expression for scheduled backups.
 * @param {*} context application context 
 * @returns Promise
 */
 function validateSchedule(context){
    return new Promise((resolve, reject) => {

        // validate access token for API authorization
        render.write("Validating schedule expression     : ")
        
        if(cron.validate(context.config.backup.schedule)){
            render.writeln(symbols.success);
            return resolve(context);
        }
    
        // no access token found; error
        render.writeln(symbols.error);
        let err = new Error(`Invalid 'PORTAINER_BACKUP_SCHEDULE' cron expression: [${context.config.backup.schedule}]`)
        render.error(err, "Invalid schedule cron expression!", 
                          "The 'PORTAINER_BACKUP_SCHEDULE' environment variable or '--schedule' command "+ 
                          "line option does not have a valid cron expression; " + 
                          "Please see the documention for more details on the schedule cron expression.");
        return reject(err);
    });
}

/**
 * Validate that a portainer access token has been provided.
 * (This does not validate the token's authorization, only that a token was provided.)
 * @param {*} context application context 
 * @returns Promise
 */
function validateAccessToken(context){
    return new Promise((resolve, reject) => {

        // validate access token for API authorization
        render.write("Validating portainer access token  : ")
        if(context.config.portainer.token && 
           context.config.portainer.token != undefined && 
           context.config.portainer.token !== ""){
            render.writeln(symbols.success);
            return resolve(context);
        }

        // no access token found; error
        render.writeln(symbols.error);
        let err = new Error("'PORTAINER_BACKUP_TOKEN' is missing!");
        render.error(err, "An API access token must be configured!", 
                          "The 'PORTAINER_BACKUP_TOKEN' environment variable or '--token' command line option is missing ; " + 
                          "You can create an API token in portainer under your user acocunt / access tokens: " + 
                          "https://docs.portainer.io/v/ce-2.11/api/access#creating-an-access-token");
        return reject(err);
    });
}

/**
 * Validate that the provided backup path/directory does exists on the file system.
 * @param {*} context application context 
 * @returns Promise
 */
function validateBackupDirectory(context){
    return new Promise((resolve, reject) => {

        let createdDirectory = false;

        // copy configured backup directory path into results data structure
        // (this will re-set the config for new substitutions if needed)
        context.results.backup.directory = context.config.backup.directory;

        // replace substitution tokens in backup directory string if needed
        const pathParts = context.results.backup.directory.split(path.sep);
        for(let index in pathParts){
            pathParts[index] = Util.processSubstitutions(pathParts[index]);
        }
        context.results.backup.directory = path.resolve(pathParts.join(path.sep));

        // ensure directory exist; if not create it
        if(context.config.mkdir && !fs.existsSync(context.results.backup.directory)){
            fs.mkdirSync(context.results.backup.directory, { recursive: true });
            createdDirectory = true;
        }

        // ensure backup path/directory exists
        render.write("Validating target backup directory : ")

        if(fs.existsSync(context.results.backup.directory)){
            render.writeln(`${symbols.success} ${createdDirectory?"CREATED":"EXISTS"} ${figures.arrowRight} ${context.results.backup.directory}`);
            return resolve(context);
        }

        // backup path/directory does not exist; error
        render.writeln(`${symbols.error} ${context.results.backup.directory}`);
        let err = new Error("'PORTAINER_BACKUP_DIRECTORY' is invalid!");
        render.error(err, "The target backup directory does not exist. ", 
                          "The 'PORTAINER_BACKUP_DIRECTORY' environment variable or " + 
                          "'--directory' command line option is not pointing to a valid " +
                          "directory on the filesystem. Please ensure the " + 
                          "backup directory or mount path exists.  You can use the " + 
                          "'PORTAINER_BACKUP_MKDIR' environment variable or '--mkdir' command line " + 
                          "option to dynamically create directories if needed.");
        return reject(err);
    });
}


/**
 * Validate the target backup file to ensure we don't overrite 
 * an existing instance unless configured to override files.
 * @param {*} context application context 
 * @returns Promise
 */
function validateBackupFile(context){
    return new Promise((resolve, reject) => {

        // copy configured backup file name into results data structure
        // (this will re-set the config for new substitutions if needed)
        context.results.backup.filename = context.config.backup.filename;

        // build backup filename string with all tokenized substitutions replaced
        context.results.backup.filename = Util.processSubstitutions(context.results.backup.filename);
        
        // construct complete backup file path using backup directory and backup filename
        context.results.backup.file = path.resolve(context.results.backup.directory, context.results.backup.filename);

        // validate now
        render.write("Validating target backup file      : ")

        // if file does not exists, then there is no overwrite conflict
        if(context.config.dryRun && !fs.existsSync(context.results.backup.file)){
            render.writeln(`${symbols.success} DRYRUN ${figures.arrowRight} ${context.results.backup.filename}`);
            context.results.backup.status="dryrun";
            return resolve(context);
        }

        // if file does not exists, then there is no overwrite conflict
        if(!fs.existsSync(context.results.backup.file)){
            render.writeln(`${symbols.success} ${context.results.backup.filename}`);
            context.results.backup.status="ready";
            return resolve(context);
        }

        // if file overwrites are allowed and this is a dry-run, then skip this validation check
        if(context.config.backup.overwrite && context.config.dryRun) {
            render.writeln(`${symbols.warning} DRYRUN ${figures.arrowRight} ${context.results.backup.filename}`);
            context.results.backup.status="dryrun";
            return resolve(context); 
        }

        // if dry-run is enabled, then skip this validation check
        if(context.config.dryRun) {
            render.writeln(`${symbols.error} DRYRUN ${figures.arrowRight} ${context.results.backup.filename}`);
            context.results.backup.status="dryrun";
            return resolve(context); 
        }

        // if file overwrites are allowed, then skip this validation check
        if(context.config.backup.overwrite) {
            render.writeln(`${symbols.warning} OVERWRITE ${figures.arrowRight} ${context.results.backup.filename}`);
            context.results.backup.status="overwrite";
            context.results.backup.overwrite=true;
            return resolve(context); 
        }

        // if the file does already exist, then there is a conflict; error
        render.writeln(`${symbols.error} ${context.results.backup.filename}`);
        context.results.backup.status="already-exists";
        let err = new Error(`Backup file [${Util.wrapFilePath(context.results.backup.file, 30)}] already exists.`);
        render.error(err, "The target backup data file already exists!", 
                          "Set the 'PORTAINER_BACKUP_OVERWRITE' environment varaiable " + 
                          "or '--overwrite' command line option to enable file overwriting.");
        return reject(err);
    });
}

/**
 * Validate portainer minimum supported version
 * @param {*} context application context 
 * @returns Promise
 */
 function validatePortainerVersion(context){
    return new Promise((resolve, reject) => {

        // validate portainer minimum supported version
        render.write("Validating portainer version       : ")
        if(compareSemVer(context.results.portainer.version, Portainer.MIN_VERSION) >= 0){
            render.writeln(`${symbols.success} v${context.results.portainer.version}`);
            return resolve(context);
        }

        // the connected portainer server does not meet the minimum version requirements
        if(context.config.portainer.ignoreVersion){
            render.writeln(`${symbols.warning} v${context.results.portainer.version} [UNSUPPORTED]`);
            if(!context.config.concise) render.unsupportedVersion(context.results.portainer.version);
            return resolve(context);
        }

        // the connected portainer server does not meet the minimum version requirements
        render.writeln(`${symbols.error} v${context.results.portainer.version}`);
        if(!context.config.concise) render.unsupportedVersion(context.results.portainer.version);
        let err = new Error("The portainer server is older than the minimum supported version.");
        render.error(err, "The portainer server is older than the minimum supported version.", 
                          `The portainer server is [${context.results.portainer.version}];  "+ 
                          "The minimum supported version is [${Portainer.MIN_VERSION}]. ` + 
                          "Please upgrade your portainer server or use the 'PORTAINER_BACKUP_IGNORE_VERSION' " + 
                          "environment variable or '--ignore-version' command line " + 
                          "option to override the version checking.");
        return reject(err);
    });
}

/**
 * Validate stack files to ensure there are no conflicts with existing files on the filesystem.
 * @param {*} context application context
 * @returns Promise
 */
function validateStackFiles(context){ 
    return new Promise((resolve, reject) => {
        let numberOfConflicts = 0;
        render.writeln("Validate stack file conflicts      : ")
        render.writeln();

        // create new map collection for stacks (indexed by stack ID)
        context.results.stacks = new Map();

        // iterate stacks
        for(let index in context.cache.stacks)
        {
            // reference stack instance
            let stack = context.cache.stacks[index];

            // check for existing docker-compose file for this stack data
            const filename = sanitize(`${stack.Name}.docker-compose.yaml`);
            const stackFile = path.resolve(context.results.backup.directory, filename)

            // assign stack file reference
            stack.file = stackFile;

            // copy stack info in results data
            context.results.stacks[stack.Id] = {                
                id: stack.Id,
                name: stack.Name,
                file: stack.file,
                filename: filename,
                directory: context.config.backup.directory,
                status: "pending"
            };

            render.write(`${figures.arrowRight}  ${stackFile} ... `)            

            // validate overwrite of existing file
            if(context.config.dryRun && !fs.existsSync(stackFile)){
                render.writeln(`${symbols.success}  (DRYRUN)`);
                context.results.stacks[stack.Id].status = "dryrun";
            }
            else if(!fs.existsSync(stackFile)){
                render.writeln(symbols.success);
                context.results.stacks[stack.Id].status = "pending";
            }
            else if (context.config.backup.overwrite && context.config.dryRun){
                render.writeln(`${symbols.warning}  (OVERWRITE; DRYRUN)`);
                context.results.stacks[stack.Id].status = "dryrun";
            }
            else if (context.config.dryRun){
                render.writeln(`${symbols.error}  (DRYRUN)`);
                context.results.stacks[stack.Id].status = "dryrun";
            }
            else if (context.config.backup.overwrite){
                render.writeln(`${symbols.warning}  (OVERWRITE)`);
                context.results.stacks[stack.Id].status = "overwrite";
                context.results.stacks[stack.Id].overwrite = true;
            }
            else{
                numberOfConflicts++;
                render.writeln(symbols.error);
                context.results.stacks[stack.Id].status = "already-exists";
            }
        }                

        // check for conflicts
        if(numberOfConflicts > 0){
            let err = new Error(`[${numberOfConflicts}] stack file(s) with the same name already exists in the target backup directory.`)
            render.error(err, "One or more target stack data files already exists!", 
                              "Set the 'PORTAINER_BACKUP_OVERWRITE' environment varaiable or '--overwrite' command line option to enable file overwriting.");            
            return reject(err);
        }

        // no file conflicts
        render.writeln();
        return resolve(context);
    });    
}

// ********************************************************************************************************
// ********************************************************************************************************
//                                          DATA RETRIEVAL METHODS
// ********************************************************************************************************
// ********************************************************************************************************


/**
 * Retrieve portainer status from portainer server API.
 * This status will include the portainer instance ID and server version.
 * @param {*} context application context
 * @returns Promise
 */
function portainerStatusCheck(context){
    render.write("Validating portainer server        : ")     
    return portainer.status()
        .then((data)=>{      // SUCCESS
            render.writeln(`${symbols.success} ${context.config.portainer.baseUrl}`);
            
            // display portainer server status
            if(!context.config.concise){
                render.writeln();
                render.status(data);
            }

            // copy portainer info in results data
            context.results.portainer = {
                version: data.Version,
                instance: data.InstanceID,
                url: context.config.portainer.baseUrl
            } 

            Promise.resolve(context);
        })
        .catch((err)=>{      // ERROR RETRIEVING PORTAINER STATUS
            render.writeln(`${symbols.error} ${context.config.portainer.baseUrl}`);
            render.error(err, "Connection to portainer server failed!");        
            return Promise.reject(err);
        })        
}

/**
 * Retrieve portainer data backup stream from portainer server.
 * Once the response stream is available, delegate to handler for saving stream data.
 * @param {*} context application context 
 * @returns Promise
 */
function portainerBackupData(context){
    render.write("Retrieving portainer data backup   : ")
    return portainer.backup()
        .then((response)=>{
            render.writeln(symbols.success);

            if(context.config.dryRun) {
                context.results.backup.status = "dryrun"
                if(!context.config.backup.stacks) render.writeln();
                return Promise.resolve();
            }
            context.results.backup.status="saving";
            return portainerSaveBackupData(context,response);
        })
        .catch((err)=>{      // ERROR RETRIEVING PORTAINER BACKUP
            render.writeln(symbols.error);
            render.error(err, "Retrieving portainer data backup failed!");        
            return Promise.reject(err);
        })        
}

/**
 * Save portainer data backup archive stream to filesystem.
 * @param {*} context application context 
 * @param {*} response portainer server response with data stream
 * @returns Promise
 */
function portainerSaveBackupData(context, response){


    render.write("Saving portainer data backup       : ")
    return portainer.saveBackup(response.data, context.results.backup.file)
        .then((file)=>{
            render.writeln(symbols.success);

            render.writeln();
            render.writeln(` ${figures.arrowRight}  ${context.results.backup.file} ... ${symbols.success}`)
            render.writeln();

            // udpate backup rsults data
            let stats = fs.statSync(context.results.backup.file);
            context.results.backup.size = stats.size,
            context.results.backup.created = stats.ctime.toISOString(),
            context.results.backup.status = "saved";

            // display backup file details            
            if(!context.config.concise){  
                render.backupFile(file);
            }
            return Promise.resolve(context);
        })
        .catch((err)=>{      // ERROR SAVING PORTAINER BACKUP
            render.writeln(symbols.error);            
            render.error(err, "Saving portainer data backup failed!");
            context.results.backup.status = "failed";
            return Promise.reject(err);
        })
}


/**
 * Retrieve portainer stacks metadata/catalog from portainer server.
 * Once the metadata/catalog is available, validate the stacks aginst
 * the filesystem to ensure no existinf file conflicts then delegate to 
 * handler for iterating stacks and retrieving individual stack 
 * docker-compose data.
 * @param {*} context application context 
 * @returns Promise
 */
function portainerBackupStacks(context){
    return portainerAcquireStacks(context)
        .then(()=>{
            return validateStackFiles(context);
        })
        .then(()=>{
            if(!context.config.dryRun)
                return portainerBackupStackFiles(context)
        })
        .then(()=>{
            return Promise.resolve(context);
        })
        .catch((err)=>{                 
            return Promise.reject(err);
        })
}

/**
 * Retrieve portainer stacks metadata/catalog from portainer server.
 * @param {*} context application context 
 * @returns Promise
 */
 function portainerAcquireStacks(context){ 
    // execute API call to get stacks from Portainer server
    render.write("Acquiring portainer stacks catalog : ")

    return portainer.stacksMetadata()
        .then((stacks)=>{            
            render.writeln(`${symbols.success} ${stacks.length} STACKS`);

            // assign stacks array reference
            context.cache.stacks = stacks;

            // display stacks metadata details            
            if(!context.config.concise){
                render.writeln();
                render.stacksCount(stacks);
            }

            return Promise.resolve(context);
        })
        .catch((err)=>{      // ERROR FETCHING STACKS METADATA
            render.writeln(symbols.error);
            render.writeln();
            render.error(err, "Portainer failed to acquire stacks metadata!");
            return Promise.reject(err);
        })            
}

/**
 * Iterate over previously retrieved stacks metadata/catalog (located in 
 * context cache) and retrieve individual stack docker-compose data.  Once
 * each statck data is acquired, save the stack data to the filesystem.
 * @param {*} context application context 
 * @returns Promise
 */
function portainerBackupStackFiles(context){ 

    // iterate over stacks metadata and fetch each stack file
    render.writeln("Downloading & save stack files     : ")
    render.writeln();

    // iterate over the stacks asynchronously 
    return Promise.all(context.cache.stacks.map(async (stack) => {
        return portainer.stackFile(stack.Id)
            .then((data)=>{
                render.writeln(`${figures.arrowRight}  saving (stack #${stack.Id}) [${stack.Name}.docker-compose.yml]  ...  ${symbols.success}`)

                // write docker-compose file for the stack data
                fs.writeFileSync(stack.file, data.StackFileContent);
                let stats = fs.statSync(stack.file);
                context.results.stacks[stack.Id].size = stats.size,
                context.results.stacks[stack.Id].created = stats.ctime.toISOString(),
                context.results.stacks[stack.Id].status = "saved";
            })
            .catch(err=>{
                context.results.stacks[stack.Id].status = "failed";
                render.writeln(`${figures.arrowRight}  saving (stack #${stack.Id}) [${stack.Name}.docker-compose.yml]  ...  ${symbols.error}`)
                render.error(err, `Portainer failed to save stack file: (stack #${stack.Id}) [${stack.Name}.docker-compose.yml]`);
                Promise.reject(err);
            });

    })).then(()=>{
        render.writeln();
        render.writeln(`Saving stack files complete        : ${symbols.success} ${context.cache.stacks.length} STACK FILES`);
        render.writeln();

        // print listing table of stack files
        if(!context.config.concise){            
            render.stackFiles(context.cache.stacks);
        }
        Promise.resolve(context);
    });
}
