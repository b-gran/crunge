import _ from 'underscore';
import algorithms from './../core/algorithms';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import moment from 'moment';

import JPGDecoder from '../../../node_modules/jpg-stream/decoder';
import JPGEncoder from '../../../node_modules/jpg-stream/encoder';
import CorruptStream from './../core/corrupt-stream';

import glob from 'glob';
import async from 'async';

import corrupt from './../core/corrupt';

// Using an IIFE, we can return early.
(() => {
    /* Set up the CLI. */
    var cl = require('commander')
        .version('1.0.0')
        .description(
            'Corrupts images in bulk\n  ' +
            'Corrupted images have the following names:\n  ' +
            '$imgName.param0-param1-...-paramN.corrupted.jpg:')

        .usage('algorithm0 param0 ... paramN, algorithm1 ... [options]')

        .option('-i, --input [path]', 'File globs to corrupt')
        .option('-o, --output [path]', 'A path to the directory to place the corrupted files in')
        .option('-z, --zest [path]', 'Zest')

        .parse(process.argv);

    /* Error handling. */
    if (cl.args.length < 1) {
        console.warn('You must provide at least one algorithm');
        return cl.help();
    }

    /* Error handling. */
    if (!cl.input || !cl.output) {
        console.warn('You must supply an input.')
        return cl.help();
    }

    // Create the output directory if it does not already exist.
    const ERR_EEXIST = 'EEXIST';
    try {
        fs.mkdirSync(cl.output);
    } catch (err) {
        // The EEXIST error just means the output directory already exists.
        // If we see a different error, we should throw.
        if (! (err.code && err.code === ERR_EEXIST))
            throw err;
    }

    // Parse the command line input to init the algorithms and collect their names
    // The input is given to us from commander as an array of space separated strings
    // There may be no params for a particular algo
    // CL input format: [ '$algorithm0Name', 'param0', 'param1', ... 'paramN,', '$algorithm1Name' 'param0', ... ]
    let [ algos, algoNames ] = _.unzip(

        // Recreate the cl input from the space-separated array, then split by comma
        // That gives us an array of algorithm strings:
        // Format: [ '$algorithm0Name param0 param1 ... paramN', '$algorithm1Name param 0 ...', ... ]
        _.map(cl.args.join(' ').split(','), (algoString) => {

            // Now split each algorithm string by spaces.
            // That gives us an array of strings where the algo name is the first arg
            // and the rest of the args are the algo params.
            // Format: [ $algorithm0Name, param0, param1, ... paramN ]
            let [ name, ...params ] = algoString.trim().split(' ');

            // Return an array st. the first element is the init'ed algorithm and
            // the second arg is the algorithm name.
            // Then, unzipping gives an array of algorithms and an array of names.
            return [ algorithms[name].init(params), name];
        })
    );

    // Join the names with - for use in the output filename.
    algoNames = algoNames.join('-');

    console.log('Using algorithms: ' + chalk.blue(algoNames));

    let splitByUnescapedString = /(?:(?:\\\s)+|[^\s])+/g;
    let inputGlobs = cl.input.match(splitByUnescapedString);

    let files = _.flatten(
        inputGlobs.map((inputGlob) => {
            return glob.sync(inputGlob);
        })
    );

    // Start all of the corruption I/O in parallel.
    async.parallel(

        // Create an async task ( function (done) { ... } ) from each of the files
        // These tasks will be started (but not run) in parallel
        files.map((file) => {
            return (done) => {
                let basename = path.basename(file);
                let ext = path.extname(basename);
                let nameNoExt = basename.split(ext)[0];
                let outputPath = path.join(cl.output, `${nameNoExt}.${algoNames}${ext}`);

                let coloredOutput = chalk.blue(outputPath);
                info('Corrupting ' + chalk.green(file) + ' -> ' + coloredOutput);

                corrupt(file, outputPath, algos)
                    // Corruption finished successfully
                    .on('close', () => {
                        info('Finished ' + coloredOutput);
                        done();
                    })
                    // Error during corruption.
                    .on('error', (err) => done(err) );
            };
        }),

        // This function runs after all the corruption tasks complete.
        (err) => {
            if (err) {
                console.log(chalk.red('An error occurred during processing'));
                throw err;
            }
            info('Corruption complete.');
        }
    );
})();

function info (msg) {
    console.log(chalk.black(`[${now()}]`) + ' ' + msg);
}

function now () {
    return moment().format('HH:mm:ss');
}
