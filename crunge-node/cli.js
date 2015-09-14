var fs = require('fs');

var corrupt = require('./corrupt');

var out = function (msg) {
    process.stdout.write(msg);
    return msg;
};

/* Set up the CLI. */
var cl = require('commander')
    .version('1.0.0')
    .description('Corrupts images')
    .usage('input_file [options]')

    .option('-a, --algorithm [algorithm]', 'The corruption algorithm to use [noise]', 'noise')
    .option('-o, --output [path]', 'The path to the output file [corrupted_img.jpg]', 'corrupted_img.jpg')

    .parse(process.argv);

/* Syntax error handling. */
if (cl.args.length !== 1) return cl.help();

var input = cl.args[0];

return fs.readFile(input, function (err, data) {
    if (err) throw err;

    var options = {
        algorithm: cl.algorithm
    };

    var corr = corrupt(data, options);

    fs.writeFile(cl.output, corr, function (err) {
        if (err) throw err;
        else return 0;
    });
});
