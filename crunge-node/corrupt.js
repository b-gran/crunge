var _ = require('underscore');

var resolveJPEGMarker = function (marker) {
    switch (marker) {
        // Not a marker
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
        case (0xD7):
        case (0xD6):
        case (0xD5):
        case (0xD4):
        case (0xD3):
        case (0xD2):
        case (0xD1):
        case (0xD0):
            return 'RST' + (marker & 0x0F).toString(16);

        // APPn
        case (0xEF):
        case (0xEE):
        case (0xED):
        case (0xEC):
        case (0xEB):
        case (0xEA):
        case (0xE9):
        case (0xE8):
        case (0xE7):
        case (0xE6):
        case (0xE5):
        case (0xE4):
        case (0xE3):
        case (0xE2):
        case (0xE1):
        case (0xE0):
            return 'APP' + (marker & 0x0F).toString(16);

        // COM
        case (0xFE):
            return 'COM';

        // EOI
        case (0xD9):
            return 'EOI';

        // Padding
        default:
            return null;
    }
};

var MarkerRegion = function (type) {
    this.type = type;
}

MarkerRegion.hasPayload = function (type) {
    switch (true) {
        case (type === 'EOI'):
        case (type === 'SOI'):
        case (type.indexOf('RST') !== -1):
            return false;

        default:
            return true;
    };
};

MarkerRegion.prototype.isPointInPayload = function (point) {
    if (!this.start || !this.end) return undefined;
    return point >= this.start && point <= this.end;
};

MarkerRegion.prototype.isPointInMarker = function (point) {
    if (!this.markerStart || !this.markerEnd) return undefined;
    return point >= this.markerStart && point <= this.markerEnd;
};

MarkerRegion.prototype.hasPayload = function () {
    return MarkerRegion.hasPayload(this.type);
};

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

var mod = function (number, n) {
    return ((number % n) + n) % n;
}

var algorithms = {

    // Adds random noise to each byte, modulo the maximum byte val.
    // Excludes the value 255 (0xFF), because 0xFF indicates a marker for the JPEG filetype.
    noise: function (byte) {
        return (byte + (Math.random() * 255 | 0)) % 255;
    },

    lessnoise: function (byte) {
        return (byte + (Math.random() * 10 | 0)) % 255;
    },

    probabilistic: (function () {
        var states = [0.01, 0.0001, 0.001];
        var pos = 0;

        return function (byte) {
            if (Math.random() > 0.999)
                pos = (pos + 1) % states.length;

            if (Math.random() > (1 - states[pos])) {
                return mod((byte + (Math.random() * 20 | 0) - 10), 255);
            } else
                return byte;
        };
    })(),

    sinusoidal: (function () {
        var step = 2 * Math.PI / 1000;
        var phi = Math.random() * Math.PI * 2;

        var t = 0;

        return function (byte) {
            var val = mod((byte + 1 * Math.sin(phi + t)) | 0, 255);
            t += step;
            return val;
        };
    })(),

    chunks: (function () {
        var chunkSize = 4;
        var pos = 0;
        var active = false;

        return function (byte) {
            if ((active && pos == 0) || (!active && Math.random() > 0.999))
                active = !active;

            if (active) {
                pos = (pos + 1) % chunkSize;
                return mod((byte + (Math.random() * 2 | 0) - 1), 255);
            }

            return byte;
        };
    })(),

    padding: (function () {
        var padVal = 0x60;

        var chunkSize = 128;
        var pos = 0;
        var active = false;

        return function (byte) {
            if ((active && pos == 0) || (!active && Math.random() > 0.9995))
                active = !active;

            if (active) {
                pos = (pos + 1) % chunkSize;
                return padVal;
            }

            return byte;
        };
    })(),

    counter: (function () {
        var chunkSize = 128;
        var pos = 0;
        var active = false;

        return function (byte) {
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

    sinusoidal_weird: (function () {
        var offset = Math.random() - 0.25;

        return function (byte) {
            // Maps byte to interval [-1, 1) (approximately)
            var arccos = Math.acos((offset + (byte - 128) / 128) % 2);

            // Maps the arccos function to the interval [0, 254]
            var byteProj = arccos * (254 / Math.PI);

            return mod(byteProj, 255);
        };
    })(),

    sinusoidal_weird_sin: (function () {
        var offset = Math.random() - 0.25;

        return function (byte) {
            // Maps byte to interval [-1, 1) (approximately)
            var arcsin = Math.asin((offset + (byte - 128) / 128) % 2);

            // Maps the arcsin function to the interval [0, 254]
            var byteProj = arcsin * (254 / Math.PI);

            return mod(byteProj, 255);
        };
    })(),

    sinusoidal_weird_tan: (function () {
        var offset = Math.random() * 254 | 0;

        return function (byte) {
            var arctan = Math.atan((offset + byte) % 254);

            // Maps the arctan function to the interval [0, 254]
            var byteProj = (arctan + Math.PI / 2) * (254 / Math.PI);

            return mod(byteProj, 128);
        };
    })(),
};

/*
 * Corrupts the contents of buffer using the specified corruption algorithm & options.
 *
 * corrupt does not modify the original buffer.
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

    _.each(buffer, function (byte, offset, buf) {
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

