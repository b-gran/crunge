import _ from 'underscore';
import algorithms from './algorithms';
import fs from 'fs';

import JPGDecoder from 'jpg-stream/decoder';
import JPGEncoder from 'jpg-stream/encoder';
import CorruptStream from './corrupt-stream';

import corrupt from './corrupt';

(() => {
    var out = function (msg) {
        process.stdout.write(msg);
        return msg;
    };

    /* Set up the CLI. */
    var cl = require('commander')
        .version('1.0.0')
        .description('Corrupts images')

        .usage('algorithm0 param0 ... paramN, algorithm1 ... [options]')

        .option('-i, --input [path]', 'The path to the input file')
        .option('-o, --output [path]', 'The path to the output file [corrupted.jpg]', 'corrupted.jpg')

        .parse(process.argv);

    /* Error handling. */
    if (cl.args.length < 1) {
        console.warn('You must provide at least one algorithm');
        return cl.help();
    }

    if (!cl.input) {
        console.warn('You must supply an input path.')
        return cl.help();
    }

    // Format: [ '$algorithmName param0 param1 ... paramN', ... ]
    var algos = _.map(cl.args.join(' ').split(','), (algoString) => {
        // Format: [ [ $algorithmName, param0, param1, ... paramN ], ... ]
        let [ name, ...params ] = algoString.trim().split(' ');

        try {
            return algorithms[name].init(params);
        } catch (e) {
            throw new Error('Invalid algorithm: ' + name);
        }
    });

    // Run the corruption with the command line args.
    return corrupt(cl.input, cl.output, algos);
})();
