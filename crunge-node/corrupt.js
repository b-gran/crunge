var _ = require('underscore');
var algorithms = require('./algorithms');

var util = require('util');
var fs = require('fs');

var stream = require('stream');
var Transform = stream.Transform;

var resolveJPEGMarker = function (marker) {
    switch (marker) {
        // Not a marker
        // 0xFF, 0x0 is an escaped 0xFF
        case (0x0): return 'ESC';

        // SOI
        case (0xD8): return 'SOI';

        // SOF0
        case (0xC0): return 'SOF0';

        // SOF2
        case (0xC2): return 'SOF2';

        // DHT
        case (0xC4): return 'DHT';

        // DQT
        case (0xDB): return 'DQT';

        // DRI
        case (0xDD): return 'DRI';

        // SOS
        case (0xDA): return 'SOS';

        // RSTn
        // 0xDn, where 0 <= n <= 7
        case (0xD0):
        case (0xD1):
        case (0xD2):
        case (0xD3):
        case (0xD4):
        case (0xD5):
        case (0xD6):
        case (0xD7):
            return 'RST' + (marker & 0x0F).toString(16);

        // APPn
        // 0xEn, where 0 <= n <= F
        case (0xE0):
        case (0xE1):
        case (0xE2):
        case (0xE3):
        case (0xE4):
        case (0xE5):
        case (0xE6):
        case (0xE7):
        case (0xE8):
        case (0xE9):
        case (0xEA):
        case (0xEB):
        case (0xEC):
        case (0xED):
        case (0xEE):
        case (0xEF):
            return 'APP' + (marker & 0x0F).toString(16);

        // COM
        case (0xFE): return 'COM';

        // EOI
        case (0xD9): return 'EOI';

        // Padding
        // If the marker doesn't match any preceding value, then the
        // 0xFF is being used as padding.
        default: return null;
    }
};

var ParseState = {};

// Base class for all parse states.
ParseState.STATE = function (byte) {
    this._byte = byte;
    this._type = 'STATE';
};
ParseState.STATE.prototype.nextByte = function (byte) {};

// Parsing hasn't begun.
ParseState.NOT_STARTED = function () { ParseState.STATE.call(this, undefined); this._type = 'NOT_STARTED'; };
util.inherits(ParseState.NOT_STARTED, ParseState.STATE);
ParseState.NOT_STARTED.prototype.nextByte = function (byte) {
    // Next byte is an escape byte.
    if (byte === 0xFF) return new ParseState.ESCAPE(byte);

    // Otherwise, the next byte is metadata/padding.
    return new ParseState.PADDING_METADATA(byte);
};

// Region before the markers containing padding/metadata
ParseState.PADDING_METADATA = function (byte) { ParseState.STATE.call(this, byte); this._type = 'PADDING_METADATA'; };
util.inherits(ParseState.PADDING_METADATA, ParseState.NOT_STARTED);

// An escape byte in the padding/metadata region
ParseState.ESCAPE = function (byte) { ParseState.STATE.call(this, byte); this._type = 'ESCAPE'; };
util.inherits(ParseState.ESCAPE, ParseState.STATE);
ParseState.ESCAPE.prototype.nextByte = function (byte) {
    var marker = resolveJPEGMarker(byte);

    // The escape byte was being used as padding.
    if (marker === null) return new ParseState.PADDING_METADATA(byte);

    // The escape byte was escaping a 0xFF.
    if (marker === 'ESC') return new ParseState.PADDING_METADATA(byte);

    // Otherwise, this the next byte indicates the start of a marker region.
    return new ParseState.MARKER_INDICATOR(byte, marker);
};

// Byte indicating which type of data will be in the next region
ParseState.MARKER_INDICATOR = function (byte, marker) {
    ParseState.STATE.call(this, byte)
    this._marker = marker;
    this._type = 'MARKER_INDICATOR';
};
util.inherits(ParseState.MARKER_INDICATOR, ParseState.STATE);
ParseState.MARKER_INDICATOR.prototype.nextByte = function (byte) {
    // Next bytes are padding, an escaped 0xFF, or the start of a new region.
    if (byte === 0xFF) return new ParseState.MARKER_REGION_ESCAPE(byte, this._marker);

    // Otherwise the next byte is the start of the region.
    return new ParseState.MARKER_REGION(byte, this._marker);
};

// Region of the JPG containing image data.
ParseState.MARKER_REGION = function (byte, marker) {
    ParseState.MARKER_INDICATOR.call(this, byte, marker)
    this._type = 'MARKER_REGION';
};
util.inherits(ParseState.MARKER_REGION, ParseState.STATE);
ParseState.MARKER_REGION.prototype.nextByte = function (byte) {
    // Next bytes are padding, an escaped 0xFF, or the start of a new region.
    if (byte === 0xFF) return new ParseState.MARKER_REGION_ESCAPE(byte, this._marker);

    // Otherwise the next byte is still part of this marker region.
    return new ParseState.MARKER_REGION(byte, this._marker);
};

// An escape byte within a marker region.
ParseState.MARKER_REGION_ESCAPE = function (byte, marker) {
    ParseState.MARKER_INDICATOR.call(this, byte, marker)
    this._type = 'MARKER_REGION_ESCAPE';
};
util.inherits(ParseState.MARKER_REGION_ESCAPE, ParseState.STATE);
ParseState.MARKER_REGION_ESCAPE.prototype.nextByte = function (byte) {
    var marker = resolveJPEGMarker(byte);

    // The escape byte was just being used as padding.
    if (marker === null) return new ParseState.MARKER_REGION(byte, this._marker);

    // An escaped 0xFF within a marker region.
    if (marker === 'ESC') return new ParseState.MARKER_REGION_0xFF(byte, this._marker);

    // Otherwise, this is the start of a new marker region.
    return new ParseState.MARKER_INDICATOR(byte, marker);
};

// An escaped 0xFF within a marker region.
ParseState.MARKER_REGION_0xFF = function (byte, marker) {
    ParseState.MARKER_INDICATOR.call(this, byte, marker)
    this._type = 'MARKER_REGION_0xFF';
};
util.inherits(ParseState.MARKER_REGION_0xFF, ParseState.STATE);
ParseState.MARKER_REGION_0xFF.prototype.nextByte = function (byte) {
    // Next bytes are padding, an escaped 0xFF, or the start of a new region.
    if (byte === 0xFF) return new ParseState.MARKER_REGION_ESCAPE(byte, this._marker);

    // Otherwise the next byte is still part of this marker region.
    return new ParseState.MARKER_REGION(byte, this._marker);
};

// Stream to perform the corruption
util.inherits(Corruptor, Transform);
function Corruptor (options) {
    Transform.call(this, options);
    this._state = new ParseState.NOT_STARTED();
};

var i = 0;

Corruptor.prototype._transform = function (chunk, enc, done) {
    var self = this;

    var chunkCorrupted = new Buffer(chunk.length);

    _.each(chunk, function (byte, offset, buf) {
        self._state = self._state.nextByte(byte);

        if (self._state instanceof ParseState.MARKER_REGION && self._state._marker === 'SOS') {
            if (Math.random() > 0.999)
                chunkCorrupted.writeUInt8((byte + 8) % 254, offset);
            else
                chunkCorrupted.writeUInt8(byte, offset);
        } else {
            chunkCorrupted.writeUInt8(byte, offset);
        }
    });

    this.push(chunkCorrupted);

    done();
};

var rs = fs.createReadStream('chicken.jpeg');
var ws = fs.createWriteStream('testCorr.jpg');
var cs = new Corruptor();
rs.pipe(cs).pipe(ws);

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
    var algos = algorithms();
    console.log(algos);
    var algorithm = (options && options.algorithm)
        ? algos[options.algorithm].algorithm((options.params))
        : algos.noise.algorithm(options.params);

    var corrupted = new Buffer(buffer.length);

    var regions, keyedRegions;
    (function () {
        var res = parseRegions(buffer);
        regions = res[0];
        keyedRegions = res[1];
    })();

    var write = function (byte, offset) {
        corrupted.writeUInt8(byte, offset);
        return byte;
    };

    var writeNoChange = function (byte, offset) {
        return write(byte, offset);
    };

    var writeCorrupted = function (byte, offset) {
        return write(algorithm.algorithm(byte), offset);
    };

    _.each(regions, function printLengths (region) {
        if (!region.start || !region.end) return console.log(region.type + ':\tno payload');
        var length = region.end - region.start;
        return console.log(region.type + ':\tpayload length: ' + length);
    });

    console.log(keyedRegions);

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
        if (offset - keyedRegions['SOS'].start < 32) {
            return writeNoChange(byte, offset);
        }

        return writeCorrupted(byte, offset);
    });

    return corrupted;
};

