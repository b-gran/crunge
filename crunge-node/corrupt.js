import _ from 'underscore';
import fs from 'fs';

import JPGDecoder from 'jpg-stream/decoder';
import JPGEncoder from 'jpg-stream/encoder';
import CorruptStream from './corrupt-stream';

/**
 *  Reads an image from the input path and writes a corrupted image
 *  to the output path.
 *
 *  algorithms is an array of functions of the form
 *  UInt8 -> UInt8
 */
export default (input, output, algorithms) => {
    // Read and decode the image
    var decodedStream = fs.createReadStream(input)
        .pipe(new JPGDecoder);

    // Run the image through all of the algorithms
    var corruptedStream = _.reduce(algorithms, (stream, algorithm) => {
        return stream.pipe(new CorruptStream({ algorithm }));
    }, decodedStream);

    // Write the corrupted image to file
    corruptedStream
        .pipe(new JPGEncoder({ quality: 50 }))
        .pipe(fs.createWriteStream(output));
}

