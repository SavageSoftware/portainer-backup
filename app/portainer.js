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
import axios from 'axios';
import fs from 'node:fs';

/**
 * This class is responsible for managing access 
 * and communication with a Portainer server.
 */
export class Portainer {

    // minimum supported portainer server version
    static MIN_VERSION = "2.11.0";
    
    // relative API URL paths
    static URL = {
        STATUS: "/api/status",
        BACKUP: "/api/backup",
        STACKS: "/api/stacks"
    }
    
    /**
     * Default Constructor
     * 
     * @param {*} context 
     */
    constructor(context) {
        this.context = context;
        this.config = context.config;
    }

    /**
     * Get portainer status (version and instance id) from portainer server.
     * 
     * @returns Promise with JSON object that contains "Version" and "InstanceID" elements.
     *          exmaple: {
     *              Version: '2.11.1',
     *              InstanceID: '8d98af6e-8908-4d5c-80f0-11b8e6272219'
     *             }
     */
    status() {    
        return new Promise((resolve, reject) => {
            const url = new URL(Portainer.URL.STATUS, this.config.portainer.baseUrl).toString();
    
            // next, get Portainer status via status API (no access token required for this call)            
            axios.get(url)
    
                // handle success (200<OK>) on status request
                .then((response) => {                    
                    resolve(response.data);
                })
                // handle error (!200) on status request    
                .catch((err) => {
                    reject(err);
                });            
            });
    }    

    /**
     * Download portainer data backup archive file from portainer server.
     * 
     * @returns Promise with HTTP response stream data from backup file request.
     */
     backup() {    
        return new Promise((resolve, reject) => {
            const url = new URL(Portainer.URL.BACKUP, this.config.portainer.baseUrl).toString();
    
            // include API TOKEN in request header; identify expected stream response
            const options = {
                headers: { 'X-API-Key': `${this.config.portainer.token}`},
                responseType: 'stream',
            };

            // create request payload; include optional backup protection password
            let payload = {
                password: (this.config.backup.password) ? this.config.backup.password : ""
            };

            // execute API call to perform backup of portainer data
            // (this will generate a data stream which includes a TAR.GZ archive file)
            axios.post(url, payload, options)
                // handle success (200<OK>) on status request
                .then((response) => {     
                    return resolve(response);
                })
                // handle error (!200) on status request    
                .catch((err) => {
                    return reject(err);
                });            
        });    
    }      
    
    /**
     * Save stream data to backup file (async).
     * 
     * @param {*} stream input stream of data to save to backup file
     * @param {*} file target file to save backup archive to.
     * @returns Promise with BACKUP FILE that was written to filesystem.
     */
    saveBackup(stream, file) {
        return new Promise((resolve, reject) => {

            // write downlaoded backup file to file system 
            const writer = fs.createWriteStream(file)
            
            // pipe file data from response stream to file writer
            stream.pipe(writer);

            // return promise on file completion or error
            writer.on('finish', ()=>{ resolve(file); });
            writer.on('error', reject);
        });        
    }

    /**
     * Get stacks metadata/catalog from portainer server.
     * @returns Promise with stacks metadata/catalog obtained from portainer server.
     */
    stacksMetadata() {
        return new Promise((resolve, reject) => {
            const url = new URL(Portainer.URL.STACKS, this.config.portainer.baseUrl).toString();
            axios.get(url,  {headers: { 'X-API-Key': `${this.config.portainer.token}`}})
                // handle success (200<OK>) on status request
                .then((response) => {     
                    return resolve(response.data);
                })
                // handle error (!200) on status request    
                .catch((err) => {
                    return reject(err);
                });     
        });        
    }

    /**
     * Get stack docker-compose file for the given stack ID from the portainer server.
     * 
     * @param {*} stackId target stack to acquire
     * @returns docker-compose data for the requested stack ID.
     */
    stackFile(stackId) {
        return new Promise((resolve, reject) => {
            const url = new URL(Portainer.URL.STACKS, this.config.portainer.baseUrl).toString();
            axios.get(url + `/${stackId}/file`,  {headers: { 'X-API-Key': `${this.config.portainer.token}`}})
                // handle success (200<OK>) on status request
                .then((response) => {     
                    return resolve(response.data);
                })
                // handle error (!200) on status request    
                .catch((err) => {
                    return reject(err);
                });     
        }); 
    }
}
