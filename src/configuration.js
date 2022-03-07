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
import path from 'node:path';
import sanitize from 'sanitize-filename';
import Util from './util.js'

export class Configuration {

    /**
     * Default Constructor
     * 
     * Initialize configuration settings with default values
     * or values defined via environment variables.
     */
    constructor() {   
        // initialize configuration settings using envrironment variables
        this.portainer = {
            token: process.env.PORTAINER_BACKUP_TOKEN || "",
            baseUrl: process.env.PORTAINER_BACKUP_URL || "http://127.0.0.1:9000",
            ignoreVersion: process.env.PORTAINER_BACKUP_IGNORE_VERSION || false
        };
        this.backup = {                
            directory: process.env.PORTAINER_BACKUP_DIRECTORY || "backup",
            filename: sanitize(process.env.PORTAINER_BACKUP_FILENAME || "portainer-backup.tar.gz"),
            file: "", /* INITIALIZED BELOW */
            password: process.env.PORTAINER_BACKUP_PASSWORD || "",
            stacks: Util.evalBool(process.env.PORTAINER_BACKUP_STACKS),
            overwrite: Util.evalBool(process.env.PORTAINER_BACKUP_OVERWRITE),
            schedule: process.env.PORTAINER_BACKUP_SCHEDULE || "0 0 0 * * * *"
        };
        this.dryRun = Util.evalBool(process.env.PORTAINER_BACKUP_DRYRUN);
        this.debug = Util.evalBool(process.env.PORTAINER_BACKUP_DEBUG);
        this.quiet = Util.evalBool(process.env.PORTAINER_BACKUP_QUIET);
        this.json = Util.evalBool(process.env.PORTAINER_BACKUP_JSON);
        this.concise = Util.evalBool(process.env.PORTAINER_BACKUP_CONCISE);
        this.mkdir = Util.evalBool(process.env.PORTAINER_BACKUP_MKDIR);
    }

    /**
     * override configuration settings if any configurtation 
     * arguments have been explicitly provided via the command
     * line arguments
     * 
     * @param {*} args 
     */
    process(args){

        // check arguments for valid settings; override config settings
        if(args.token)         this.portainer.token = args.token;
        if(args.url)           this.portainer.baseUrl = args.url;
        if(args.ignoreVersion) this.portainer.ignoreVersion = Util.evalBool(args.ignoreVersion);
        if(args.directory)     this.backup.directory = args.directory;
        if(args.filename)      this.backup.filename = args.filename;
        if(args.password)      this.backup.password = args.password;
        if(args.overwrite)     this.backup.overwrite = Util.evalBool(args.overwrite);
        if(args.stacks)        this.backup.stacks = Util.evalBool(args.stacks);
        if(args.schedule)      this.backup.schedule = args.schedule;
        if(args.dryrun)        this.dryRun = Util.evalBool(args.dryrun);
        if(args.debug)         this.debug = Util.evalBool(args.debug);
        if(args.quiet)         this.quiet = Util.evalBool(args.quiet);
        if(args.json)          this.json = Util.evalBool(args.json);
        if(args.concise)       this.concise = Util.evalBool(args.concise);
        if(args.mkdir)         this.mkdir = Util.evalBool(args.mkdir);

        // construct backup file path using backup directory and backup filename
        this.backup.file = path.resolve(this.backup.directory, this.backup.filename);
        this.backup.directory = path.resolve(this.backup.directory);
    }
}

