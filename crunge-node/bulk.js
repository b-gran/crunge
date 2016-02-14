import _ from 'underscore';
import algorithms from './algorithms';
import fs from 'fs';
import path from 'path';

import JPGDecoder from 'jpg-stream/decoder';
import JPGEncoder from 'jpg-stream/encoder';
import CorruptStream from './corrupt-stream';

import glob from 'glob';
import async from 'async';

import corrupt from './corrupt';

(() => {
    var out = function (msg) {
        process.stdout.write(msg);
        return msg;
    };

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

    if (!cl.input || !cl.output) {
        console.warn('You must supply an input.')
        return cl.help();
    }

    // Format: [ '$algorithmName param0 param1 ... paramN', ... ]
    var algos = _.map(cl.args.join(' ').split(','), (algoString) => {
        // Format: [ [ $algorithmName, param0, param1, ... paramN ], ... ]
        let [ name, ...params ] = algoString.trim().split(' ');

        return algorithms[name].init(params);
    });

    var algoNames = _.map(cl.args.join(' ').split(','), (algoString) => {
        // Format: [ [ $algorithmName, param0, param1, ... paramN ], ... ]
        let [ name, ...params ] = algoString.trim().split(' ');
        return name;
    }).join('-');

    console.log('Using algorithms: ' + algoNames);

    let inputGlobs = cl.input.split(' ');

    async.each(inputGlobs, (inputGlob, done) => {
        glob(inputGlob, (err, files) => {
            _.each(files, (file) => {
                let basename = path.basename(file);
                let ext = path.extname(basename);
                let nameNoExt = basename.split(ext)[0];
                let outputPath = path.join(cl.output, `${nameNoExt}.${algoNames}${ext}`);

                console.log('Corrupting ' + file + ' -> ' + outputPath)

                corrupt(file, outputPath, algos);
            })
            done();
        });
    });
})();
