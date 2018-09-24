#!/usr/bin/env node

const concat = require('concat');
const request = require('request');
const unzip = require('unzip');
const jsonfile = require('jsonfile');
const colors = require('colors');
const fs = require('fs-extra');
const uglify = require('uglify-js');

const applicationVersion = "1.0.0";

const packageDownloadUrl = "https://github.com/alexanderpharwood/sully-starter/archive/master.zip";
const packageVersion = "1.0.0";

var build = {};
build.router = "";
build.controllers = "";
build.middleware = "";
build.views = "";

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
            if (typeof buildConfig.router === "undefined"){
                return errorAndExit("The 'build.json' does not contain a 'router' element.");
            }
            build.router = fs.readFileSync(buildConfig.router, "UTF8");


            //Compile middleware (optional)
            function compileMiddleware(callback){

                if (typeof buildConfig.middleware === "undefined"){
                    callback();
                } else {

                    console.log("--> Compiling middleware");
                    var middlewareArray = [];

                    for (var middlewareName in buildConfig.middleware){
                        middlewareArray.push(buildConfig.middleware[middlewareName]);
                    }

                    concat(middlewareArray).then(function(middleware){
                        build.middleware = "(function(){" + middleware + "})();";
                        callback();
                    });
                }
            }


            //Compile views (required)
            function compileViews(callback){

                //build.json views element is present
                if (typeof buildConfig.views === "undefined"){
                    return errorAndExit("build.json' does not contain a 'views' element");
                } else {
                    console.log("--> Compiling views");
                    build.views = "(function(){";

                    for (var viewName in buildConfig.views){
                        build.views += getRegisterViewCode(viewName, buildConfig.views[viewName]);
                    }

                    build.views += "})();";
                    callback();
                }
            }


            //Compile controllers
            function compileControllers(callback){

                if (typeof buildConfig.controllers === "undefined"){
                    return errorAndExit("build.json' does not contain a 'controllers' element");
                } else {
                    //build.json controllers element is present
                    console.log("--> Compiling controllers");

                    var controllersArray = [];

                    for (var controllerName in buildConfig.controllers){
                        controllersArray.push(buildConfig.controllers[controllerName]);
                    }

                    concat(controllersArray).then(function(controllers){
                        build.controllers = "(function(){" + controllers + "})();";
                        callback();
                    });
                }
            }


            //Run the compilation methods
            compileMiddleware(function(){

                compileControllers(function(){

                    compileViews(function(){

                        //We will only get here if everythign has worked okay.

                        concatonated = (build.router + build.controllers + build.middleware + build.views);

                        //If this is a production build
                        if(args[1] === "--prod"){

                            console.log("--> Compiling production build: " + buildConfig.builds.production.output + " (minified)");

                            concatonated = "(function(){" + uglify.minify(concatonated).code + "})();";

                            fs.writeFileSync(buildConfig.builds.production.output, concatonated);

                        } else {

                            console.log("--> Compiling development build: " + buildConfig.builds.development.output + " (uncompressed)");

                            fs.writeFileSync(buildConfig.builds.development.output, concatonated);

                        }

                        console.log("Build finished successfully!".green);
                        console.log("\n");

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

        if(args[2] !== "starter"){
            packageDownloadUrl = args[2];
        }

        console.log("--> Downloading package from: " + packageDownloadUrl);

        var downloadStream = request(packageDownloadUrl).pipe(fs.createWriteStream("sully-" + packageVersion + ".zip"));
        downloadStream.on('error', function(err){
            return errorAndExit(err);
        });

        downloadStream.on('finish', function(response){

            console.log("--> Download finished");

            console.log("--> Extracting");

            if (fs.existsSync(args[1])){
                return errorAndExit("A directory already exists with that name");
            }

            fs.createReadStream("sully-" + packageVersion + ".zip").pipe(unzip.Extract({ path: "." }));

            console.log("--> Extract finished");
            console.log(args[1].green + " created successfully!".green);
            console.log("\n");

        });

        break;

    default:

        console.log("Usage: sullyjs <command>");
        console.log("\n");

        console.log("     new <project-name>     " + "Create a new project");
        console.log("\n");

        console.log("     build <options>     " + "   Build the project in the current directory");
        console.log("                            Options:");
        console.log("                               --prod  (specifies a production build)");
        console.log("\n");

        break;

}
