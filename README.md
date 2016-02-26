# crunge
Corrupt image files in interesting ways.

```
__NOTE__: crunge is a WIP, so please excuse the code quality of the web interface ;)
          if anything doesn't work, please let know. 
```

### installing
```
git clone https://github.com/b-gran/crunge.git
cd crunge
npm install
```

### building
the commands below generate builds of the web interface.

to use the cli utilities, you will need babel
```
# generate a dev build (of the web interface) with sourcemaps & start a dev server
gulp dev

# generate a minified, production-ready build
gulp production
```

### running
```
# from the command line
babel-node -- src/lib/cli/cli.js -i 'yourimage.jpg' -o 'corruptedimg.jpg' padding sinusoidal_weird_cos

# for help, 
babel-node -- src/lib/cli/cli.js --help

# to corrupt many images at once
babel-node -- src/lib/cli/bulk.js -i 'image-glob/*.jpg' -o 'an-output-folder/' chunks padding sinusoidal_weird_sin
```
