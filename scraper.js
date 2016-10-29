(function () {
    'use strict';

    // Required node modules

    var fs = require("fs");

    var osmosis = require("osmosis");

    var json2csv = require("json2csv");


    var globalError = false; // Variable to control if an error has been fired or not when scraping, so feedback can be given in the console

    function createFolderInSystemSync(folderName) {
        if (!fs.existsSync(folderName)) {
            console.log("No /" + folderName + " folder exists");
            fs.mkdirSync(folderName);
            console.log("Folder /" + folderName + " created");
        }
    }

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

    function createFileInSystemSync(data, folderName, option) {
        var today = new Date();
        var filename, path;

        if (option === "data") {
            filename = formatTimestamp(today, "filename") + ".csv";
            path = folderName + "/" + filename;

            console.log("Creating file: " + filename);

            if (fs.existsSync(path)) {
                console.log("File " + filename + " already exists in " + folderName + "/");
                console.log("Overwriting file...");
            }
            fs.writeFile(path, data, function (error) {
                if (!error) {
                    console.log("Scraping process......... END");
                } else {
                    logError(error);
                    console.error("There was an error when writing the output file, please execute script again");
                }
            });
        } else if (option === "error") {
            filename = "scraper-error.log";
            path = folderName + "/" + filename;

            fs.appendFile(path, data, function (error) {
                if (error) {
                    console.error("There was an error appending the data to the file");
                }
            });
        }
    }

    function scrapeContent(folderName) {
        var jsonArray = [];
        var url = "http://www.shirts4mike.com/";

        console.log("Scraping process......... START");

        createFolderInSystemSync(folderName);

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
                // Add the correct URL structure from the links
                data.URL = url + "/" + data.URL;
                // Set the date of the specific request
                data.Time = formatTimestamp(new Date(), "data");

                // Push the data that will be converted in csv
                jsonArray.push(data);
            })
            .done(function () {
                if (!globalError) {
                    logContent(jsonArray, folderName);
                } else {
                    console.log("An error has happened during the execution. Please restart the process");
                }
            })
            .error(function (error) {
                logError(error, folderName);
            });
    }

    function logContent(data, folderName) {
        // Transform json data to csv
        var csv = json2csv({
            data: data,
            fields: ['Title', 'Price', 'ImageURL', 'URL', 'Time']
        });

        // Write the file in the system
        createFileInSystemSync(csv, folderName, "data");
    }

    function logError(error, folderName) {
        var errorData = "[ " + formatTimestamp(new Date(), "error") + " ] " + error + "\n";
        globalError = true;
        createFileInSystemSync(errorData, folderName, "error");
    }

    // Run the content-scraper
    scrapeContent("data");

}());