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

import { DateTime } from "luxon";
import sanitize from 'sanitize-filename';

/**
 * This class is used to expose commonly used utility methods.
 */
export default class Util {        
    constructor() { /* nothing */ }

    /**
     * Used to determine if an unknown object value results in a TRUE|FALSE.
     * @param {*} arg any boolean, number or string
     * @returns true|false
     */
    static evalBool(arg) {

        // object
        if(!arg) return false;
        if(arg === undefined) return false;
        if(arg === null) return false;
        
        // bool
        if(arg === false) return false;
        if(arg === true) return true;

        // int    
        if(arg === 0) return false;
        if(arg === 1) return true;

        // string
        let argLower = arg.toString().toLowerCase();
        if(argLower == "") return false;  
        if(argLower == "false") return false;
        if(argLower == "no") return false;
        if(argLower == "0") return false;
        return true;
    }

    /**
     * Wrap a filename string so that it can fix 
     * inside a fixed width container.
     * 
     * @param {*} input file name (not path)
     * @param {*} width maximum character width to wrap within
     * @returns 
     */
     static wrapFilePath(input, width) {
        let leadingSlash = input.startsWith('/');
        width = parseInt(width) || 80;
        let res = []
        , cLine = ""
        , words = input.split("/")
        ;

        for (let i = 0; i < words.length; ++i) {
            let cWord = words[i];
            if ((cLine + cWord).length <= width) {
                cLine += (cLine ? "/" : "") + cWord;
            } else {
                res.push(cLine);
                cLine = "/" + cWord;
            }
        }

        if (cLine) {
            res.push(cLine);
        }

        return (leadingSlash ? "/" : "") + res.join("\n");
    };   
    
    /**
     * Process file or directory string for named or tokenized substitutions
     * Sanitize the name for any invalid filesystem characters.
     * @param {*} name 
     */
     static hasSubstitutions(name){
        // find any substitution replacements in file|directory name string
        const substitutions = name.match(/\{\{.*?\}\}/g);
        if(substitutions) return true;
        return false;
     }
    
    /**
     * Process file or directory string for named or tokenized substitutions
     * Sanitize the name for any invalid filesystem characters.
     * @param {*} name 
     */
    static processSubstitutions(name){

        // copy name to working results variable
        let results = name;
        
        // find any substitution replacements in file|directory name string
        const substitutions = results.match(/\{\{.*?\}\}/g);
        if(substitutions){

            // get current date & time 
            let now = DateTime.now();

            // iterate over substitutions
            for (let substitution of substitutions) {
                
                // remove "{{" and "}}" from substitution string
                let token = substitution.slice(2, -2);

                // handle "UTC_" prefix
                if(token.startsWith("UTC_")){
                    now = now.toUTC();
                    token = token.slice(4);
                }
                
                // process the token string and replace value with either a known named format or tokenized replacement 
                let value = substitution;        
                switch(token){
                    // simple, commonly used formats
                    case "DATETIME": {  value = now.toFormat("yyyy-MM-dd'T'HHmmss"); break; }
                    case "TIMESTAMP": {  value = now.toFormat("yyyyMMdd'T'HHmmss.SSSZZZ"); break; }
                    case "DATE": {  value = now.toFormat("yyyy-MM-dd"); break; }
                    case "TIME": {  value = now.toFormat("HHmmss"); break; }

                    // ISO standard formats
                    case "ISO8601": { value = now.toISO(); break; }
                    case "ISO": { value = now.toISO(); break; }
                    case "ISO_BASIC": { value = now.toISO({format: 'basic'}); break; }
                    case "ISO_NO_OFFSET": { value = now.toISO({includeOffset: false}); break; }
                    case "ISO_DATE": { value = now.toISODate(); break; }
                    case "ISO_WEEKDATE": { value = now.toISOWeekDate(); break; }
                    case "ISO_TIME": { value = now.toISOTime(); break; }

                    // other standards-based formats              
                    case "RFC2822": { value = now.toRFC2822(); break; }
                    case "HTTP": { value = now.toHTTP(); break; }
                    case "MILLIS": { value = now.toMillis(); break; }
                    case "SECONDS": { value = now.toSeconds(); break; }
                    case "UNIX": { value = now.toSeconds(); break; }
                    case "EPOCH": { value = now.toSeconds(); break; }

                    // locale based formats
                    case "LOCALE": { value = now.toLocaleString(); break; }
                    case "LOCALE_DATE": { value = now.dt.toLocaleString(DateTime.DATE_SHORT); break; }
                    case "LOCALE_TIME": { value = now.dt.toLocaleString(DateTime.TIME_24_SIMPLE); break; }

                    // named date preset formats
                    case "DATE_SHORT": { value = now.toLocaleString(DateTime.DATE_SHORT); break; }
                    case "DATE_MED": { value = now.toLocaleString(DateTime.DATE_MED); break; }
                    case "DATE_FULL": { value = now.toLocaleString(DateTime.DATE_FULL); break; }
                    case "DATE_HUGE": { value = now.toLocaleString(DateTime.DATE_HUGE); break; }
                    case "DATE_MED_WITH_WEEKDAY": { value = now.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY); break; }

                    // named time preset formats
                    case "TIME_SIMPLE": { value = now.toLocaleString(DateTime.TIME_SIMPLE); break; }
                    case "TIME_WITH_SECONDS": { value = now.toLocaleString(DateTime.TIME_WITH_SECONDS); break; }
                    case "TIME_WITH_SHORT_OFFSET": { value = now.toLocaleString(DateTime.TIME_WITH_SHORT_OFFSET); break; }
                    case "TIME_WITH_LONG_OFFSET": { value = now.toLocaleString(DateTime.TIME_WITH_LONG_OFFSET); break; }
                    case "TIME_24_SIMPLE": { value = now.toLocaleString(DateTime.TIME_24_SIMPLE); break; }
                    case "TIME_24_WITH_SECONDS": { value = now.toLocaleString(DateTime.TIME_24_WITH_SECONDS); break; }
                    case "TIME_24_WITH_SHORT_OFFSET": { value = now.toLocaleString(DateTime.TIME_24_WITH_SHORT_OFFSET); break; }
                    case "TIME_24_WITH_LONG_OFFSET": { value = now.toLocaleString(DateTime.TIME_24_WITH_LONG_OFFSET); break; }

                    // nam,ed date/time preset formats
                    case "DATETIME_SHORT": { value = now.toLocaleString(DateTime.DATETIME_SHORT); break; }
                    case "DATETIME_MED": { value = now.toLocaleString(DateTime.DATETIME_MED); break; }
                    case "DATETIME_FULL": { value = now.toLocaleString(DateTime.DATETIME_FULL); break; }
                    case "DATETIME_HUGE": { value = now.toLocaleString(DateTime.DATETIME_HUGE); break; }
                    case "DATETIME_SHORT_WITH_SECONDS": { value = now.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS); break; }
                    case "DATETIME_MED_WITH_SECONDS": { value = now.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS); break; }
                    case "DATETIME_FULL_WITH_SECONDS": { value = now.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS); break; }
                    case "DATETIME_HUGE_WITH_SECONDS": { value = now.toLocaleString(DateTime.DATETIME_HUGE_WITH_SECONDS); break; }

                    // tokenized string
                    default: { value = now.toFormat(token); break; }
                }
                results = results.replace(substitution, value);
            }

            //console.log("UNSANITIZED :: ", results);
            results = sanitize(results, { replacement: (offender)=>{   
                if(offender === '/') return "-";
                if(offender === ':') return "_"; // "꞉"; // U+FF1A
                return ""; 
            }});
            //console.log("SANITIZED   :: ", results);
        }        

        // return resulting substituted string
        return results;
    }
}

  

