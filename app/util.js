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
}

  

