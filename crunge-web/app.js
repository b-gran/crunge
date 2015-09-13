var express = require('express');
var http = require('http');
var path = require('path');
var statics = require('serve-static');
var logger = require('morgan');

var app = express();

// Set up jade views.
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Logging
app.use(logger('dev'));

// Serve static files.
app.use(statics(path.join(__dirname, 'public')));

// Routing
app.all('/', function (req, res, next) {
    return res.render('main');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// Error handling.
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: err
    });
});

// Server

// Normalize a port into a number, string, or false.
function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}


var debug = require('debug')('crunge:server');

var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

// Create an HTTP server.
var server = http.createServer(app);
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

// 'error' event listener.
function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    var bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

// 'listening' event listener.
function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    debug('Listening on ' + bind);
}
