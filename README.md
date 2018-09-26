
# Sully.js CLI
Sully is a "WVC" (Whatever View Controller) framework. We make no assumptions about your data layer, whilst providing a structure for logic and templating.

**Getting started**
```
$ npm i sully -g
```
Because the tool is only for creating and building projects, it's appropriate and more convenient to install it globally.

## Documentation

**Creating a new project**
```
$ sully new <project-name> <template>
```
The new command will pull a project template and extract it and ensure you are all ready to go. We reccomend using "starter-project" (without the quotes) as your template; however, you can pop any url in here.

**Building a project**
```
$ sully build <options>
```
The build command will compile your controllers, middleware, and views. The "--prod" flag is optional, and will minify and compile the build to your specified production location. If the "--prod" flag is not specified, the build will not be minified and will be compiled to your specified development location.

## For development only

This is the repository for Sully's CLI source. If you are looking to use Sully, please [check us out on npm](https://www.npmjs.com/package/sully).

```
git clone https://github.com/alexanderpharwood/sully-cli.git
```
```
npm install
```
You should be good to branch and get your dev on!
