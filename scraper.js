(function () {
    'use strict';

    // Required node modules

    /**
     * Requires fs node internal module
     * 
     * @requires fs
     */
    var fs = require("fs");

    /**
     * Requires osmosis module
     * 
     * The election of this module has been done because of:
     *      1) Build is passing
     *      2) Has more than 1000 downloads/month with more than 300 downloads/week (average)
     *      3) Extensive documentation, even with a site with more detailed info
     *      4) Easy to understand usage and comprehensive way to navigate through the links of the page by concatenating methods
     * NPM: https://www.npmjs.com/package/osmosis
     * Github: https://github.com/rchipka/node-osmosis
     * @requires osmosis
     */
    var osmosis = require("osmosis");

    /**
     * Requires json2csv module
     * 
     * The election of this module has been done because of:
     *      1) Build is passing, the dependencies are up to date and has a 100% coverage 
     *      2) More than 100,000 downloads/month with more than 6,000 downloads/day (average)
     *      3) Extensive documentation with an extensive set of examples
     *      4) Easy usage for the purpose of this web scraper
     * NPM: https://www.npmjs.com/package/json2csv
     * Github: https://github.com/zemirco/json2csv
     * @requires json2csv
     */
    var json2csv = require("json2csv");

    // Global variable to control if an error has been fired or not when scraping, so feedback can be given in the console
    var globalError = false;

    /**
     * Creates a folder in the system in case it doesn't exist
     * 
     * @param {string} folderName   - Name of the folder to create inside of the main app folder
     */
    function createFolderInSystemSync(folderName) {
        if (!fs.existsSync(folderName)) {
            console.log("No /" + folderName + " folder exists");
            fs.mkdirSync(folderName);
            console.log("Folder /" + folderName + " created");
        }
    }

    /**
     * Formats a timestamp for a specific need in the file (data to write, filename, error message) 
     * 
     * @param {Object} timestamp    - Date object
     * @param {String} option       - Sets the kind of format required in the output:
     *                                  "data" - "YYYY-MM-DD HH:MM:SS"
     *                                  "filename" - "YYYY-MM-DD"
     *                                  "error" - "WeekDay Month DD YYYY HH:MM:SS GMT+Ofset (Timezone)"
     * @returns timestamp formatted for the specific purpose specified in the option
     */
    function formatTimestamp(timestamp, option) {
        switch (option) {
            case "data":
                // Date format of what it will be included in the 'csv' file
                return timestamp
                    .toISOString()
                    .replace(/T/, ' ') // replace T with a space
                    .replace(/\..+/, ''); // delete the dot and everything after;
            case "filename":
                // Date format for the 'csv' filename
                var day = timestamp.getDate();
                var month = timestamp.getMonth() + 1; // January is 0, need to add 1
                var fullYear = timestamp.getFullYear();
                return fullYear + "-" + month + "-" + day;
            case "error":
                // Date format to be included in the error log file
                return timestamp.toString();
            default:
                // In case no option has been set, then the function logs an error asking the 
                // developer to se an option
                console.error("Please set an option");
                break;
        }
    }

    /**
     * Sets the file path of the file to write depending of the selected option
     * 
     * @param {String} folderName   - Name of the folder to store the file
     * @param {String} option       - Sets the file path that will be the target file:
     *                                  "data"  - The path to get is the 'csv' file for the current date
     *                                  "error" - The path to get is the error-log file
     * @returns path of the file to write, either the data file or the error-log
     */
    function setFilePath(folderName, option) {
        var filename, path;

        if (option === "data" || option === undefined) {
            filename = formatTimestamp(new Date(), "filename") + ".csv";
            path = folderName + "/" + filename;
        } else if (option === "error") {
            filename = "scraper-error.log";
            path = folderName + "/" + filename;
        }

        return path;
    }

    /**
     * Writes the data to the specified file path. In case the file exists, it gets overwritten
     * 
     * @param {String} data         - The data to write. In this case it will be a 'csv' data
     * @param {String} filePath     - The file path of the data file that will be written
     */
    function writeToDataFile(data, filePath) {
        console.log("Creating file: '" + filePath + "'");

        if (fs.existsSync(filePath)) {
            console.log("File '" + filePath + "' already exists");
            console.log("Overwriting file...");
        }
        fs.writeFile(filePath, data, function (error) {
            if (!error) {
                console.log("Scraping process......... END");
            } else {
                logError(error);
                console.error("There was an error when writing the output file, please execute script again");
            }
        });
    }

    /**
     * Writes (or in this case, appends to the end of it) the errors that have occurred during the scraping process
     * 
     * @param {String} data     - The data to write. In this case it will be an error string formatted accordingly
     * @param {String} filePath - The file path of the data file that will be written
     */
    function writeToErrorFile(data, filePath) {
        fs.appendFile(filePath, data, function (error) {
            if (error) {
                console.error("There was an error appending the data to the file");
            }
        });
    }

    /**
     * Writes the data in the specified file with the format specified in the option
     * 
     * @param {String} data         - The data to write
     * @param {String} folderName   - Name of the folder to store the file
     * @param {String} option       - Sets which of the files to write:
     *                                  "data"  - Writes on the 'csv' file 
     *                                  "error" - Writes on the error-log file
     */
    function writeFileInSystem(data, folderName, option) {
        if (option === "data") {
            writeToDataFile(data, setFilePath(folderName, option));
        } else if (option === "error") {
            writeToErrorFile(data, setFilePath(folderName, option));
        }
    }

    /**
     * Scrapes the Shirts 4 Mike (http://www.shirts4mike.com/) website for the product list
     * 
     * @param {String} folderName  - Name of the folder to store the scraped data file
     */
    function scrapeContent(folderName) {
        var jsonArray = [];
        var url = "http://www.shirts4mike.com/";

        console.log("Scraping process......... START");

        createFolderInSystemSync(folderName);

        // Use osmosis to go through the website and its pages
        osmosis
            .get(url)
            .follow('.nav .shirts a@href')
            .find('.products li a')
            .set({
                URL: '@href'
            })
            .follow('@href')
            .set({
                Title: '.shirt-picture img@alt',
                Price: 'span.price',
                ImageURL: '.shirt-picture img@src',
            })
            .data(function (data) {
                // As the data is generated, it gets pushed into a JSON array

                // Set a URL field by prepending the hostname to it. Osmosis doesn't return the full URL but the relative path in the href attribute
                data.URL = url + "/" + data.URL;

                // Adds a time field inside of the data Object 
                data.Time = formatTimestamp(new Date(), "data");

                jsonArray.push(data);
            })
            .done(function () {
                // Once the scraping finishes, log the content into the file
                if (!globalError) {
                    logContent(jsonArray, folderName);
                } else {
                    console.log("An error has happened during the execution. Please restart the process");
                }
            })
            .error(function (error) {
                // If the scraping process failed, then log the error
                logError(error, folderName);
            });
    }

    /**
     * Parses the Osmosis data into a csv file and then writes it into the file
     * 
     * @param {String} data         - Data to write into the file
     * @param {String} folderName   - Name of the folder to store the scraped data file
     */
    function logContent(data, folderName) {
        // Transform json data to csv
        var csvData = json2csv({
            data: data,
            fields: ['Title', 'Price', 'ImageURL', 'URL', 'Time']
        });

        writeFileInSystem(csvData, folderName, "data");
    }

    /**
     * Transforms the error info into the correctly formatted string and writes it into the file.
     * It also sets a global error variable to true, to not log the 'csv' file
     * 
     * @param {String} error        - Error fired by the scraping module function
     * @param {String} folderName   - Name of the folder to store the scraped data file
     */
    function logError(error, folderName) {
        var errorData = "[ " + formatTimestamp(new Date(), "error") + " ] " + error + "\n";

        // Notify there's an error, so a message can be shown in the done callback 
        globalError = true;

        writeFileInSystem(errorData, folderName, "error");
    }

    // Run the content-scraper
    scrapeContent("data");

}());