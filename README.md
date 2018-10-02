![Sully logo](https://raw.githubusercontent.com/alexanderpharwood/sully-website/master/app/assets/images/logo-purple.svg?sanitize=true&123)
# Sully.js CLI
Sully is a "WVC" (Whatever View Controller) framework. We make no assumptions about your data layer, whilst providing a structure for logic and templating.

**Getting started**
```
$ npm i sully -g
```
Because the tool is only for creating and building projects, it's appropriate and more convenient to install it globally.

## Usage

**Creating a new project**
```
$ sully new <project-name> <template>
```
The new command will pull a project template and extract it and ensure you are all ready to go. We recommend using "starter" (without the quotes) as your template; however, you can pop any url in here which points to a Sully template (zipped).

**Building a project**
```
$ sully build
```
The build command will compile your controllers, middleware, views, and routes. It will build a development and a production version, which will both be written to your specified locations in build.json.

**the autobuilder**
```
$ sully autobuilder <path> <options>
```
The autobuilder will listen for changes and perform automatic builds. The path parameter is option, and will tell the autobuilder to listen for changes only in the specified file or directory. If no path is specified, the autobuilder will listen for changes in all files.


For all things Sully: [sullyjs.org](https://sullyjs.org)
