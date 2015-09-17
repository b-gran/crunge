var _ = require('underscore');

var resolveJPEGMarker = function (marker) {
    switch (marker) {
        // Not a marker
        // 0xFF, 0x0 is an escaped 0xFF
        case (0x0):
            return null;

        // SOI
        case (0xD8):
            return 'SOI';

        // SOF0
        case (0xC0):
            return 'SOF0';

        // SOF2
        case (0xC2):
            return 'SOF2';

        // DHT
        case (0xC4):
            return 'DHT';

        // DQT
        case (0xDB):
            return 'DQT';

        // DRI
        case (0xDD):
            return 'DRI';

        // SOS
        case (0xDA):
            return 'SOS';

        // RSTn
        // 0xDn, where 0 <= n <= 7
        case (0xD0): case (0xD1): case (0xD2): case (0xD3):
        case (0xD4): case (0xD5): case (0xD6): case (0xD7):
            return 'RST' + (marker & 0x0F).toString(16);

        // APPn
        // 0xEn, where 0 <= n <= F
        case (0xE0): case (0xE1): case (0xE2): case (0xE3):
        case (0xE4): case (0xE5): case (0xE6): case (0xE7):
        case (0xE8): case (0xE9): case (0xEA): case (0xEB):
        case (0xEC): case (0xED): case (0xEE): case (0xEF):
            return 'APP' + (marker & 0x0F).toString(16);

        // COM
        case (0xFE):
            return 'COM';

        // EOI
        case (0xD9):
            return 'EOI';

        // Padding
        // If the marker doesn't match any preceding value, then the
        // 0xFF is being used as padding.
        default:
            return null;
    }
};

var MarkerRegion = function (type) {
    this.type = type;
}

/*
 * Returns true if the specified marker type has a payload.
 * This property is determined by the JPEG spec.
 */
MarkerRegion.hasPayload = function (marker) {
    switch (true) {
        case (marker === 'EOI'):
        case (marker === 'SOI'):
        case (marker.indexOf('RST') !== -1): // case of RSTn
            return false;

        // All other markers have payloads.
        default:
            return true;
    };
};

/*
 * Returns true if the point is within the payload region.
 *
 * this.start and this.end must be set in order for this
 * function to work.
 *
 * this.start should be the first index after the marker.
 *
 * this.end should be the last index before the NEXT marker
 * (identified by a 0xFF followed by a VALID marker byte)
 */
MarkerRegion.prototype.isPointInPayload = function (point) {
    if (!this.start || !this.end) return undefined;
    return point >= this.start && point <= this.end;
};

/*
 * Returns true if the point is within the bytes that
 * define this region's marker.
 *
 * this.markerStart and this.markerEnd must be set in order for this
 * function to work.
 *
 * this.markerStart should be the index of this marker's 0xFF byte.
 *
 * this.markerEnd should be the last byte that defines the marker
 * (usually this.markerStart + 1)
 */
MarkerRegion.prototype.isPointInMarker = function (point) {
    if (!this.markerStart || !this.markerEnd) return undefined;
    return point >= this.markerStart && point <= this.markerEnd;
};

/*
 * Alias of the hasPayload static method.
 */
MarkerRegion.prototype.hasPayload = function () {
    return MarkerRegion.hasPayload(this.type);
};

/*
 * Splits a JPEG buffer into regions demarcated by its JPEG markers.
 *
 * Returns a tuple in the following format:
 *
 * ( [ regions as an array ], { regions with JPEG markers as keys } )
 *
 * The array is in the form:
 *      [ MarkerRegion, MarkerRegion, ... ]
 *      where the MarkerRegions are ordered by start point
 *
 * The object is of the form:
 *      {
 *          "marker": MarkerRegion,
 *          "marker": MarkerRegion,
 *          ...
 *      }
 *      e.g.
 *      {
 *          "SOS": {
 *              type: "SOS",
 *              start: <offset>,
 *              end: <offset>,
 *              markerStart: <offset>,
 *              markerEnd: <offset>
 *          }
 *      }
 *
 */
var parseRegions = function (buffer) {
    var regions = [];
    var keyedRegions = {};

    _.each(buffer, function (byte, offset, buf) {
        if (byte !== 0xFF) return;

        var marker = resolveJPEGMarker(buf[offset + 1]);
        if (marker === null) return;

        // Update the previous region with end data (if applicable)
        if (regions.length > 0 && regions[regions.length - 1].hasPayload()) {
            regions[regions.length - 1].end = offset - 1;
        }

        var region = new MarkerRegion(marker);
        region.markerStart = offset;
        region.markerEnd = offset + 1;

        if (MarkerRegion.hasPayload(marker)) {
            // Add start information to regions with payloads.
            region.start = offset + 2;
        }

        regions.push(region);
        keyedRegions[marker] = region;
    });

    return [ regions, keyedRegions ];
};

/*
 * Returns number (mod n)
 * Will always be a positive number.
 */
var mod = function (number, n) {
    return ((number % n) + n) % n;
}

/*
 * All of the algorithms operate modulo 255, not modulo 256.
 * The algorithms are intentionally excluding the value 255 (0xFF),
 * because 0xFF indicates a marker for the JPEG filetype.
 */
var algorithms = {

    // Adds positive noise in the range [0, 254] to each byte, modulo the maximum byte val.
    noise: function (byte) {
        return (byte + (Math.random() * 255 | 0)) % 255;
    },

    // Adds positive noise in the range [0, 10] to each byte, modulo the maximum byte val.
    lessnoise: function (byte) {
        return (byte + (Math.random() * 10 | 0)) % 255;
    },

    // Adds noise in the range [-10, 10] with probability determined by the current
    // element in the states array.
    // The position in the states array changes with probability 0.001
    probabilistic: (function () {
        var states = [0.01, 0.0001, 0.001];
        var pos = 0;

        return function probabilistic (byte) {
            if (Math.random() > 0.999)
                pos = (pos + 1) % states.length;

            if (Math.random() > (1 - states[pos])) {
                return mod((byte + (Math.random() * 20 | 0) - 10), 255);
            } else
                return byte;
        };
    })(),

    // Adds sin(t) to the each byte.
    // The amplitude is 5, period is 1000, and initial angle is selected randomly.
    sinusoidal: (function () {
        var step = 2 * Math.PI / 1000;
        var phi = Math.random() * Math.PI * 2;

        var t = 0;

        return function sinusoidal (byte) {
            var val = mod((byte + 5 * Math.sin(phi + t)) | 0, 255);
            t += step;
            return val;
        };
    })(),

    // Adds noise (range [-1, 1]) in 4-byte chunks. The probability of beginning a chunk is 0.001
    chunks: (function () {
        var chunkSize = 4;
        var pos = 0;
        var active = false;

        return function chunks (byte) {
            if ((active && pos == 0) || (!active && Math.random() > 0.999))
                active = !active;

            if (active) {
                pos = (pos + 1) % chunkSize;
                return mod((byte + (Math.random() * 2 | 0) - 1), 255);
            }

            return byte;
        };
    })(),

    // Adds the padding value 0x60 to 128-byte chunks. The probability of beginning a chunk is 0.0005
    padding: (function () {
        var padVal = 0x60;

        var chunkSize = 128;
        var pos = 0;
        var active = false;

        return function padding (byte) {
            if ((active && pos == 0) || (!active && Math.random() > 0.9995))
                active = !active;

            if (active) {
                pos = (pos + 1) % chunkSize;
                return padVal;
            }

            return byte;
        };
    })(),

    // Converts each byte value to a real number in the range [-1, 1) (approximately)
    // Then maps arccos(byte) to the range [0, 254]
    // Applies the arccos construction in 128-byte chunks.
    sinusoidal_chunk: (function () {
        var chunkSize = 128;
        var pos = 0;
        var active = false;

        return function sinusoidal_chunk (byte) {
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
    })(),

    // Applies the arccos function to the byte val, then maps the sinusoidal value back to
    // the range of possible byte values.
    // Adds a random offset in the range [-0.25, 0.75] to the arccos calculation.
    sinusoidal_weird_cos: (function () {
        var offset = Math.random() - 0.25;

        return function sinusoidal_weird_cos (byte) {
            // Maps byte to interval [-1, 1) (approximately)
            var arccos = Math.acos((offset + (byte - 128) / 128) % 2);

            // Maps the arccos function to the interval [0, 254]
            var byteProj = arccos * (254 / Math.PI);

            return mod(byteProj | 0, 255);
        };
    })(),

    // Applies the arccsin function to the byte val, then maps the sinusoidal value back to
    // the range of possible byte values.
    // Adds a random offset in the range [-0.25, 0.75] to the arcsin calculation.
    sinusoidal_weird_sin: (function () {
        var offset = Math.random() - 0.25;

        return function sinusoidal_weird_sin (byte) {
            // Maps byte to interval [-1, 1) (approximately)
            var arcsin = Math.asin((offset + (byte - 128) / 128) % 2);

            // Maps the arcsin function to the interval [0, 254]
            var byteProj = arcsin * (254 / Math.PI);

            return mod(byteProj | 0, 255);
        };
    })(),

    // Applies the arctan function to the byte val, then maps the sinusoidal value back to
    // a restricted range of byte values (the range [0, 128]).
    // Adds a random offset in the range [-0.25, 0.75] to the arctan calculation.
    sinusoidal_weird_tan: (function () {
        var offset = Math.random() * 254 | 0;

        return function sinusoidal_weird_tan (byte) {
            var arctan = Math.atan((offset + byte) % 254);

            // Maps the arctan function to the interval [0, 254]
            var byteProj = (arctan + Math.PI / 2) * (254 / Math.PI);

            return mod(byteProj | 0, 128);
        };
    })(),
};

/*
 * Corrupts the contents of buffer using the specified corruption algorithm & options.
 *
 * This function does not modify the original buffer, and is side effect free.
 *
 * options: {
 *      [ Optional ]
 *      algorithm: String,
 * }
 */
var corrupt = module.exports = function (buffer, options) {
    var algorithm = (options && options.algorithm)
        ? algorithms[options.algorithm]
        : algorithms.noise;

    var corrupted = new Buffer(buffer.length);

    var regions, keyedRegions;
    (function () {
        var res = parseRegions(buffer);
        regions = res[0];
        keyedRegions = res[1];
    })();

    var writeNoChange = function (byte, offset) {
        var val = byte;
        corrupted.writeUInt8(val, offset);
        return val;
    };

    var writeCorrupted = function (byte, offset) {
        var val = algorithm(byte);
        corrupted.writeUInt8(val, offset);
        return val;
    };

    _.each(buffer, function generateOutput (byte, offset, buf) {
        if (!keyedRegions['SOS'].isPointInPayload(offset)) {
            // Don't alter data outside of the start of scan region.
            return writeNoChange(byte, offset);
        }

        // Don't alter (0xFF, 0x0) pairs
        if ((byte === 0xFF && buf[offset + 1] === 0x0) ||
            (byte === 0x0 && buf[offset - 1] === 0xFF)) {
            return writeNoChange(byte, offset);
        }

        // Don't alter the number of colors in the SOS region.
        if (offset - keyedRegions['SOS'].start < 18) {
            return writeNoChange(byte, offset);
        }

        return writeCorrupted(byte, offset);
    });

    return corrupted;
};

