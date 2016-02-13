import _ from 'underscore';
import util from 'util';
import PixelStream from 'pixel-stream';

import algorithms from './algorithms';

// Stream to perform the corruption

function CorruptStream (options) {
    if (!options.algorithm) throw new Error('You must provide an algorithm to construct a CorruptStream');
    this.algorithm = options.algorithm;
    PixelStream.call(this, _.omit(options, 'algorithm'));
};

util.inherits(CorruptStream, PixelStream);

CorruptStream.prototype._writePixels = function (chunk, done) {
    var corrupted = new Buffer(chunk.length);

    _.each(chunk, (byte, offset) => {
        corrupted.writeUInt8(this.algorithm(byte), offset);
    });

    this.push(corrupted);

    done();
};

export default CorruptStream;
