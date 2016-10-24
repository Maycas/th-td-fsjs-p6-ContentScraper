(function () {
    'use strict';

    // Required node modules
    var fs = require("fs");

    var osmosis = require("osmosis");

    var json2csv = require("json2csv");

    var globalError = false;

    function createFolderInSystemSync(folderName) {
        if (!fs.existsSync(folderName)) {
            console.log("No /" + folderName + " folder exists");
            fs.mkdirSync(folderName);
            console.log("Folder /" + folderName + " created");
        }
    }

    function formatTimestamp(timestamp) {
        var day = timestamp.getDate();
        var month = timestamp.getMonth() + 1; // January is 0, need to add 1
        var fullYear = timestamp.getFullYear();

        return fullYear + "-" + month + "-" + day;
    }

    function createFileInSystemSync(data, folderName) {
        var today = new Date();
        var filename = formatTimestamp(today) + ".csv";
        var path = folderName + "/" + filename;

        createFolderInSystemSync(folderName);

        console.log("Creating file: " + filename);

        //
        if (fs.existsSync(path)) {
            console.log("File " + filename + " already exists in " + folderName + "/");
            console.log("Overwriting file...");
        }
        fs.writeFile(path, data, function (error) {
            if (!error) {
                console.log("Scraping process......... END");
            } else {
                logError(error);
                console.log("There was an error when writing the output file, please execute script again");
            }
        });
    }

    function scrapeContent(folderName) {
        var jsonArray = [];
        var url = "http://www.shirts4mike.com/";

        console.log("Scraping process......... START");

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
                data.Time = new Date();
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
                logError(error);
            });
    }

    function logContent(data, folderName) {
        // Transform json data to csv
        var csv = json2csv({
            data: data,
            fields: ['Title', 'Price', 'ImageURL', 'URL', 'Time']
        });

        // Write the file in the system
        createFileInSystemSync(csv, folderName);
    }

    function logError(error) {
        // TODO: Log the error in a file
        globalError = true;
        console.log(error);
    }

    // Run the content-scraper
    scrapeContent("data");

}());