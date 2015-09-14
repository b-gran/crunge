var _ = require('underscore');

var resolveJPEGMarker = function (marker) {
    var appN = 0;
    var rstN = 0;
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
        case (0xD7): rstN++;
        case (0xD6): rstN++;
        case (0xD5): rstN++;
        case (0xD4): rstN++;
        case (0xD3): rstN++;
        case (0xD2): rstN++;
        case (0xD1): rstN++;
        case (0xD0):
            return 'RST' + rstN;

        // APPn
        case (0xEF): appN++;
        case (0xEE): appN++;
        case (0xED): appN++;
        case (0xEC): appN++;
        case (0xEB): appN++;
        case (0xEA): appN++;
        case (0xE9): appN++;
        case (0xE8): appN++;
        case (0xE7): appN++;
        case (0xE6): appN++;
        case (0xE5): appN++;
        case (0xE4): appN++;
        case (0xE3): appN++;
        case (0xE2): appN++;
        case (0xE1): appN++;
        case (0xE0):
            return 'APP' + appN;

        // COM
        case (0xFE):
            return 'COM';

        // EOI
        case (0xD9):
            return 'EOI';
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

var algorithms = {

    // Adds random noise to each byte, modulo the maximum byte val.
    // Excludes the value 255 (0xFF), because 0xFF indicates a marker for the JPEG filetype.
    noise: function (byte) {
        return (byte + (Math.random() * 255 | 0)) % 255;
    },

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

