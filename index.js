#!/usr/bin/env node

const concat = require('concat');
const request = require('request');
const unzip = require('unzip');
const jsonfile = require('jsonfile');
const colors = require('colors');
const fs = require('fs-extra');
const uglify = require('uglify-js');
const path = require('path');
const exec = require('child_process').exec;
const chokidar = require('chokidar');
const express = require('express');
const archiver = require('archiver');

const applicationVersion = "1.0.8";

var templateToDownload = "";

//This will in the future be pulled from a json file on the website.
const templateThemes = {};
templateThemes.starter = "https://github.com/alexanderpharwood/sully-starter/archive/master.zip";

var build = {};
build.router = "";
build.controllers = "";
build.middleware = "";
build.views = "";
build.customScripts = "";

var concatonated = "";

const [,, ... args] = process.argv;

function getRegisterViewCode(name, path){
    var template = fs.readFileSync(path, "utf8");

    //sanitise the template, encoding quote and removing line breaks.
    template = template.replace(new RegExp("'", "g"), "&apos;");
    template = template.replace(/(\r\n\t|\n|\r\t)/gm,"");

    return "Sully.registerView('" + name + "', '" + template + "');\n\n";
}

console.log("\n");
console.log("Sully.js ".blue + applicationVersion.blue);

switch(args[0]){

    case "build":

        console.log("--> Starting build");

        function errorAndExit(message){

            var messageString = "ERROR: " + message;

            console.log(messageString.red);

            return;

        }

        //load the build.json file.
        jsonfile.readFile('build.json', function(err, buildConfig) {

            if(err){
                return errorAndExit("The 'build.json' either has an error in it or can not be found");
            }

            //Compile router
            if (typeof buildConfig.build.router === "undefined"){
                return errorAndExit("The 'build.json' does not contain a 'router' element.");
            }
            build.router = fs.readFileSync(buildConfig.build.router, "UTF8");

            //Compile middleware (optional)
            function compileMiddleware(callback){

                if (typeof buildConfig.build.middleware === "undefined"){
                    callback();
                } else {

                    console.log("--> Compiling middleware");
                    var middlewareArray = [];

                    for (var middlewareName in buildConfig.build.middleware){
                        middlewareArray.push(buildConfig.build.middleware[middlewareName]);
                    }

                    concat(middlewareArray).then(function(middleware){
                        build.middleware = middleware;
                        callback();
                    });
                }
            }


            //Compile views (required)
            function compileViews(callback){

                //build.json views element is present
                if (typeof buildConfig.build.views === "undefined"){
                    return errorAndExit("build.json' does not contain a 'views' element");
                } else {
                    console.log("--> Compiling views");

                    for (var viewName in buildConfig.build.views){
                        build.views += getRegisterViewCode(viewName, buildConfig.build.views[viewName]);
                    }

                    callback();
                }
            }


            //Compile controllers
            function compileControllers(callback){

                if (typeof buildConfig.build.controllers === "undefined"){
                    return errorAndExit("build.json' does not contain a 'controllers' element");
                } else {
                    //build.json controllers element is present
                    console.log("--> Compiling controllers");

                    var controllersArray = [];

                    for (var controllerName in buildConfig.build.controllers){
                        controllersArray.push(buildConfig.build.controllers[controllerName]);
                    }

                    concat(controllersArray).then(function(controllers){
                        build.controllers = controllers;
                        callback();
                    });
                }
            }

            //Compile custom scripts
            function compileCustomScripts(callback){

                //If add any additional scripts defined in build.jsonfile
                if (buildConfig.build.scripts.constructor === Array && buildConfig.build.scripts.length){

                    //build.json controllers element is present
                    console.log("--> Compiling custom scripts");

                    var scriptsArray = [];

                    for (var scriptName in buildConfig.build.scripts){
                        scriptsArray.push(buildConfig.build.scripts[scriptName]);
                    }

                    concat(scriptsArray).then(function(scripts){
                        build.scripts = scripts;
                        callback();
                    });

                } else {

                    callback();

                }

            }


            //Run the compilation methods
            compileMiddleware(function(){

                compileControllers(function(){

                    compileViews(function(){

                        compileCustomScripts(function(){

                            compileCustomScripts

                            //We will only get here if everythign has worked okay.

                            concatonated = ('(function(){' +
                                build.router +
                                build.controllers +
                                build.middleware +
                                build.views +
                                build.scripts +
                                '})();');

                            //Write uncompressed to disk
                            console.log("--> Compiling development build (uncompressed)");
                            fs.writeFileSync(buildConfig.build.output, concatonated);

                            //Write compressed to disk
                            console.log("--> Compiling production build (compressed)");
                            concatonated = uglify.minify(concatonated).code;
                            var compressedFileName = buildConfig.build.output.substr(0, buildConfig.build.output.length - 3) + '.min.js';
                            fs.writeFileSync(compressedFileName, concatonated);

                            console.log("🎉   Build finished successfully!   🎉".green);
                            console.log("\n");

                        });

                    });

                });

            });

        });

        break;

    case "new":

        if (typeof args[1] === "undefined"){
            return errorAndExit("No project name specified");
        }

        console.log("--> creating new project: " + args[1]);

        if (templateThemes.hasOwnProperty(args[2])){
            //If the template is on the official list
            templateToDownload = templateThemes[args[2]];
        } else {
            //if not them download it from the given url
            templateToDownload = args[2];
        }

        console.log("--> Downloading package from: " + templateToDownload);

        var downloadStream = request(templateToDownload).pipe(fs.createWriteStream("tmp.sully.template.zip"));
        downloadStream.on('error', function(err){
            return errorAndExit(err);
        });

        downloadStream.on('finish', function(response){

            console.log("--> Download finished");

            console.log("--> Extracting");

            if (fs.existsSync(args[1])){
                return errorAndExit("A directory already exists with that name");
            }

            var extractResult = fs.createReadStream("tmp.sully.template.zip").pipe(unzip.Extract({ path: args[1] }));

            extractResult.on('error', function(err){
                fs.unlinkSync("tmp.sully.template.zip");
                return errorAndExit("The file found at the requested url either does not exist or is corrupt.");
            });

            extractResult.on('finish', function(){
                fs.unlinkSync("tmp.sully.template.zip");
                console.log("--> Extract finished");
                console.log(args[1].green + " created successfully!".green);
                console.log("\n");
            });

        });

        break;

    case "autobuilder":

        //load the build.json file.
        jsonfile.readFile('build.json', function(err, buildConfig) {

            if(err){
                return errorAndExit("The 'build.json' either has an error in it or can not be found");
            }

            //Default to listen for all files
            var listen = path.resolve() + "/";

            //if they have specified a directory to listen on via the build.json file
            if (typeof buildConfig.autobuilder !== "undefined" && typeof buildConfig.autobuilder.path !== "undefined"){

                if (!fs.existsSync(path.resolve() + '/' + buildConfig.autobuilder.path)){
                    return errorAndExit(buildConfig.autobuilder.path + " does not exist.");
                }

                listen += buildConfig.autobuilder.path;

            }

            //if they have specified a directory to listen on via the command line, take this over the build.json definition
            if(typeof args[1] !== "undefined"){

                if (!fs.existsSync(path.resolve() + args[1])){
                    return errorAndExit(args[1] + " does not exist.");
                }

                //Reset in case the yhave defined a path in build,sjon too
                var listen = path.resolve()  + "/";

                listen += args[1];

            }

            console.log("--> Listening for changes: " + listen);

            var ignorePaths = [];

            ignorePaths.push(/(^|[\/\\])\../);

            if (typeof buildConfig.autobuilder.ignore !== "undefined"){

                for (var i in buildConfig.autobuilder.ignore){

                    ignorePaths.push(new RegExp('(.*)?' + buildConfig.autobuilder.ignore[i] + '(.*)?'));
                }
            }

            chokidar.watch(listen, { ignored: ignorePaths }).on('change', (event, path) => {

                exec('Sully build', (error, stdout, stderr) => {

                        console.log(stdout);
                        console.log(stderr);
                        console.log('--> Still listening...');

                    });
            });

        });

        break;

    case "serve":

    jsonfile.readFile('build.json', function(err, buildConfig) {

        if(err){
            return errorAndExit("The 'build.json' either has an error in it or can not be found");
        }

        var port = 3000;
        var app = express();

        if(typeof buildConfig.serve !== "undefined" && typeof buildConfig.serve.staticPaths !== "undefined"){

            for (var key in buildConfig.serve.staticPaths){
                app.get('*/' + buildConfig.serve.staticPaths[key] + '/*', express.static(path.resolve()));
            }

        } else {
            app.get('*/app/*', express.static(path.resolve()));
        }

        //Any files which arent found will fall back to 404 adn thus be router tp index.html
        //where sully will handle the 404 page.

        app.all('/*', function(req, res, next) {
            // Just send the index.html for other files to support HTML5Mode
            res.sendFile('index.html', { root: path.resolve() });
        });

        if (typeof args[1] !== "undefined" ){

            if (Number.isInteger(parseInt(args[1]))) {
                port = args[1];
            } else {
                console.log(args[1] + " is not a valid port number");
            }

        } else if (typeof buildConfig.serve.port !== "undefined"){
            if (Number.isInteger(parseInt(buildConfig.serve.port))) {
                port = buildConfig.serve.port;
            } else {
                console.log(buildConfig.serve.port + " is not a valid port number, in build.json");
            }
        }

        app.listen(port);

        console.log("--> Sully dev server running at: http://localhost:".green + port.toString().green);

    });

    break;

    case "release":

        jsonfile.readFile('build.json', function(err, buildConfig) {

            if (err){
                return errorAndExit("The 'build.json' either has an error in it or can not be found");
            }

            var archive  = archiver('zip');

            try {

                fs.lstatSync('releases');

            } catch (err) {

                fs.mkdir('releases');

            }

            var output = fs.createWriteStream(path.resolve() + '/releases/' + buildConfig.release.version + '.zip');

            archive.pipe(output);

            if (typeof buildConfig.release === "undefined"){

                errorAndExit("No 'release' parameter found in build.json");

            }

            if (typeof buildConfig.release.include === "undefined"){

                errorAndExit("No 'include' parameter found in 'release' in build.json");

            }

            for (i = 0; i < buildConfig.release.include.length; i++){

                var relPath = buildConfig.release.include[i];

                if (fs.lstatSync(relPath).isDirectory()){

                    archive.directory(relPath, { name: relPath});

                } else if (fs.lstatSync(relPath).isFile()){

                    archive.file(relPath, { name: relPath});

                }

            }

            archive.on('error', function(err) {
              throw err;
            });

            archive.on('finish', function(err) {

                console.log(("Release " + buildConfig.release.version + " successfully compiled!").green);

            });

            archive.finalize();

        });

        break;

    default:

        console.log("Usage: sully <command>");
        console.log("\n");

        console.log("     new <project-name> <template>    " + "Create a new project");
        console.log("\n");

        console.log("     build <options>     " + "   Build the project in the current directory");
        console.log("                            Options:");
        console.log("                               --prod  (specifies a production build)");
        console.log("\n");

        break;

}
