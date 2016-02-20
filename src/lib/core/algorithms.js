var _ = require('underscore');

/*
 * Returns number (mod n)
 * Will always be a positive number.
 */
var mod = function (number, n) {
    return ((number % n) + n) % n;
};

// Create a param for use by the algorithm function.
var param = function generateParam (name, type) {
    return {
        name: name,
        type: type,
    };
};

class Algorithm {
    constructor (func, params) {
        // params is an array of { name, type } objects required to run the corruption function
        this.params = params;
        this.function = func;
    }

    get parameters () {
        return this.params;
    }

    description () {
        return 'This algorithm requires ' + this.params.length + ' parameters,\n\t' +
                JSON.stringify(this.params);
    };

    // Returns a function that can corrupt a single byte or an array of bytes.
    init (params) {
        if (this.params && this.params.length > 0 && params.length !== this.params.length)
            throw new Error(this.description());

        // Init the corruption with params
        let f = this.function.apply(null, params);
        return (data) => {
            return f(data);
        };
    };
}

/*
 * All of the algorithms operate modulo 255, not modulo 256.
 * The algorithms are intentionally excluding the value 255 (0xFF),
 * because 0xFF indicates a marker for the JPEG filetype.
 */
export default {
    // Adds positive noise in the range [0, 254] to each byte, modulo the maximum byte val.
    noise: new Algorithm (function () {
        return function (byte) {
            return (byte + (Math.random() * 255 | 0)) % 255;
        };
    }),

    // Adds positive noise in the range [0, 10] to each byte, modulo the maximum byte val.
    lessnoise: new Algorithm (function () {
        return function (byte) {
            return (byte + (Math.random() * 10 | 0)) % 255;
        };
    }),

    // Adds noise in the range [-10, 10] with probability determined by the current
    // element in the states array.
    // The position in the states array changes with probability 0.001
    probabilistic: new Algorithm (function () {
        var states = [0.01, 0.0001, 0.001];
        var pos = 0;

        return function probabilistic(byte) {
            if (Math.random() > 0.999)
                pos = (pos + 1) % states.length;

            if (Math.random() > (1 - states[pos])) {
                return mod((byte + (Math.random() * 20 | 0) - 10), 255);
            } else
                return byte;
        }
    }),

    // Adds sin(t) to the each byte.
    // The amplitude is 5, period is 1000, and initial angle is selected randomly.
    sinusoidal: new Algorithm (function () {
        var step = 2 * Math.PI / 1000;
        var phi = Math.random() * Math.PI * 2;

        var t = 0;

        return function (byte) {
            var val = mod((byte + 5 * Math.sin(phi + t)) | 0, 255);
            t += step;
            return val;
        };
    }),

    // Adds noise (range [-1, 1]) in 4-byte chunks. The probability of beginning a chunk is 0.001
    chunks: new Algorithm (function () {
        var chunkSize = 4;
        var pos = 0;
        var active = false;

        return function chunks(byte) {
            if ((active && pos == 0) || (!active && Math.random() > 0.999))
                active = !active;

            if (active) {
                pos = (pos + 1) % chunkSize;
                return mod((byte + (Math.random() * 2 | 0) - 1), 255);
            }

            return byte;
        };
    }),

    // Adds the padding value 0x60 to 128-byte chunks. The probability of beginning a chunk is 0.0005
    padding: new Algorithm (function () {
        var padVal = 0x60;

        var chunkSize = 128;
        var pos = 0;
        var active = false;

        return function padding(byte) {
            if ((active && pos == 0) || (!active && Math.random() > 0.9995))
                active = !active;

            if (active) {
                pos = (pos + 1) % chunkSize;
                return padVal;
            }

            return byte;
        };
    }),

    // Converts each byte value to a real number in the range [-1, 1) (approximately)
    // Then maps arccos(byte) to the range [0, 254]
    // Applies the arccos construction in 128-byte chunks.
    sinusoidal_chunk: new Algorithm (function () {
        var chunkSize = 128;
        var pos = 0;
        var active = false;

        return function sinusoidal_chunk(byte) {
            if ((active && pos == 0) || (!active && Math.random() > 0.9995))
                active = !active;

            if (active) {
                pos = (pos + 1) % chunkSize;

                var arccos = Math.acos((byte - 128) / 128);
                var byteProj = arccos * (254 / Math.PI);

                return mod(byteProj, 255);
            }

            return byte;
        };
    }),

    // Applies the arccos function to the byte val, then maps the sinusoidal value back to
    // the range of possible byte values.
    // Adds a random offset in the range [-0.25, 0.75] to the arccos calculation.
    sinusoidal_weird_cos: new Algorithm (function () {
        var offset = Math.random() - 0.25;

        return function sinusoidal_weird_cos(byte) {
            // Maps byte to interval [-1, 1) (approximately)
            var arccos = Math.acos((offset + (byte - 128) / 128) % 2);

            // Maps the arccos function to the interval [0, 254]
            var byteProj = arccos * (254 / Math.PI);

            return mod(byteProj | 0, 255);
        };
    }),

    // Applies the arccsin function to the byte val, then maps the sinusoidal value back to
    // the range of possible byte values.
    // Adds a random offset in the range [-0.25, 0.75] to the arcsin calculation.
    sinusoidal_weird_sin: new Algorithm (function () {
        var offset = Math.random() - 0.25;

        return function sinusoidal_weird_sin(byte) {
            // Maps byte to interval [-1, 1) (approximately)
            var arcsin = Math.asin((offset + (byte - 128) / 128) % 2);

            // Maps the arcsin function to the interval [0, 254]
            var byteProj = arcsin * (254 / Math.PI);

            return mod(byteProj | 0, 255);
        };
    }),

    // Applies the arctan function to the byte val, then maps the sinusoidal value back to
    // a restricted range of byte values (the range [0, 128]).
    // Adds a random offset in the range [-0.25, 0.75] to the arctan calculation.
    sinusoidal_weird_tan: new Algorithm (function () {
        var offset = Math.random() * 254 | 0;

        return function sinusoidal_weird_tan(byte) {
            var arctan = Math.atan((offset + byte) % 254);

            // Maps the arctan function to the interval [0, 254]
            var byteProj = (arctan + Math.PI / 2) * (254 / Math.PI);

            return mod(byteProj | 0, 128);
        };
    }),

    // Uses the moving average of the bytes of the image
    moving_average: new Algorithm (function (size) {
        var samples = [];
        var pos = 0;

        var average = function avg(array) {
            return _.reduce(array, function (acc, item) {
                return acc + item / array.length;
            }, 0);
        };

        return function moving_average(byte) {
            samples[pos] = byte;
            pos = (pos + 1) % size;

            return average(samples) | 0;
        };
    }, param('size', 'Number')),

    first_bytes: new Algorithm (function (numBytes, multiplier) {
        var counter = 0;

        return function (byte) {
            if (numBytes - counter++ > 0)
                return ((byte * multiplier) | 0) % 255;

            return byte;
        };
    }, [
        param('numBytes', 'Number'),
        param('multiplier', 'Number'),
    ]),
};
