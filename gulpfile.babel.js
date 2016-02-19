import _ from 'underscore';
import gulp from 'gulp';
import rename from 'gulp-rename';
import del from 'del';

import browserSync from 'browser-sync';

import babelify from 'babelify';
import browserify from 'browserify';
import watchify from 'watchify';

import merge from 'merge-stream';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import sourcemaps from 'gulp-sourcemaps';
import uglify from 'gulp-uglify';
import runSequence from 'run-sequence';
import sass from 'gulp-sass';

import emptyFunction from 'fbjs/lib/emptyFunction';

import gutil from 'gulp-util';
import chalk from 'chalk';

/**
 * OUTPUT HELPERS
 */

// Generate better looking error messages using chalk.
function mapError (err) {
    if (err.fileName) {
        // regular error
        return gutil.log(chalk.red(err.name)
            + ': '
            + chalk.yellow(err.fileName.replace(__dirname + '/src/', ''))
            + ': '
            + 'Line '
            + chalk.magenta(err.lineNumber)
            + ' & '
            + 'Column '
            + chalk.magenta(err.columnNumber || err.column)
            + ': '
            + chalk.blue(err.description));
    }

    // browserify error
    return gutil.log(chalk.red(err.name)
        + ': '
        + chalk.yellow(err.message));
};

// Log file watcher updates
function mapUpdate (evt) {
    let type = evt.type || 'updated';

    // For non-browserify events, the changed paths are in evt.path
    // For browserify events, evt is the changed paths
    // evt.path & path can either be a single path or an array of paths.
    let paths = _.flatten([ (evt.path || evt) ]);

    _.each(paths, (path) => {
        let shortenedPath = path.split('src').reduce((prev, current) => current);
        gutil.log(
            'File ' +
            chalk.green(shortenedPath) +
            ' was ' +
            chalk.blue(type) +
            '. Rebuilding...'
        );
    })
};

/**
 * CLEAN
 * rm -rf the dist directory
 */

gulp.task('clean', () => {
    return del([ 'dist/**/*' ]);
});

/**
 * createBundle
 * Generate a bundle from a browserify/watchify bundle
 */

function createBundle (bundler, cb = emptyFunction) {
    return bundler.bundle()
        .on('error', mapError)
        .pipe(source('app.js'))
        .pipe(buffer())
        .pipe(gulp.dest('./dist/js'))
        .pipe(rename('app.min.js'))
        .pipe(sourcemaps.init({ loadMaps: true }))
            .pipe(uglify())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist/js'))
        .on('end', cb)
};

/*
 * CONSTANTS
 */

const config = {
    // App entry
    entry: './src/js/client.js',

    // Supported langauges
    babelOpts: {
        presets: [ 'es2015', 'react', 'stage-0' ]
    },
};

/**
 * BROWSERIFY
 */

// Generate a browserify bundle
gulp.task('bundle', () => {
    let bundler = browserify(config.entry, { debug: true }).transform(babelify, config.babelOpts);
    return createBundle(bundler);
});

// Generate a browserify bundle, watch for changes, and rebuild
gulp.task('bundle:dev', (done) => {
    let args = _.extend(watchify.args, { debug: true });
    let bundler = watchify(browserify(config.entry, args)).transform(babelify, config.babelOpts);

    createBundle(bundler, done);
    bundler.on('update', (evt) => {
        mapUpdate(evt);
        createBundle(bundler);
    });
});

// Generate a browserify bundle without sourcemaps
gulp.task('bundle:production', () => {
    // Without sourcemaps
    let bundler = browserify(config.entry).transform(babelify, config.babelOpts);

    return bundler.bundle()
        .on('error', mapError)
        .pipe(source('app.js'))
        .pipe(buffer())
        .pipe(rename('app.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('dist/js'))
});

/**
 * FILE COPYING
 */

// Copy a src glob to dest
function copyFiles (src, dest) {
    return gulp
        .src(src)
        .pipe(gulp.dest(dest));
};

// Just copy index.html to the dist directory
gulp.task('html', () => {
    return copyFiles('src/index.html', 'dist');
});

// Re-copy index.html after changes
gulp.task('html:dev', () => {
    let watcher = gulp.watch('src/index.html', [ 'html' ]);
    watcher.on('change', mapUpdate);
});

// Copy the assets to dist, preserving file structure
gulp.task('assets', () => {
    return gulp
        .src('assets/**/*', { base: 'assets' })
        .pipe(gulp.dest('dist'));
});

// Copies font-awesome files to dist/
gulp.task('font-awesome', (done) => {
    let css = copyFiles(
        [
            'node_modules/font-awesome/css/font-awesome.min.css',
            'node_modules/font-awesome/css/font-awesome.css.map',
        ],
        'dist/css'
    );

    let fonts = copyFiles(
        'node_modules/font-awesome/fonts/*',
        'dist/fonts'
    );

    return merge(css, fonts);
});

// Copies the bootstrap files from node_modules/ to dist/
gulp.task('bootstrap', (done) => {
    /*
    return runSequence(
        [ 'bootstrap:css', 'bootstrap:fonts' ],
        done
    );
    */

    let css = copyFiles(
        [
            './node_modules/bootstrap/dist/css/bootstrap.min.css',
            './node_modules/bootstrap/dist/css/bootstrap.min.css.map'
        ],
        'dist/css'
    );

    let fonts = copyFiles(
        './node_modules/bootstrap/dist/fonts/**/*',
        'dist/fonts'
    );

    return merge(css, fonts);
})

/**
 * SASS COMPILATION
 */

// Compile sass to css
gulp.task('sass', () => {
    return gulp.src('src/scss/**/*.scss')
        .pipe(sass().on('error', mapError))
        .pipe(gulp.dest('dist/css'));
});

// Recompile sass after changes
gulp.task('sass:dev', () => {
    let watcher = gulp.watch('src/scss/**/*.scss', [ 'sass' ]);
    watcher.on('change', mapUpdate);
});

/**
 * BUILD TASKS
 *
 * Sequentially run all of the tasks required to bundle the app
 * and generate auxiliary files.
 */

// The dev, dev+watch, and production builds are almost identical.
// The only difference is watch and sourcemaps.
//
// type is the bundle type to build (e.g. bundle:dev, bundle:production bundle)
//
// tasks is an optional array of gulp tasks to run after the build is complete
// tasks should be in a format runSequence will understand.
function build (type, cb, tasks = []) {
    if (!_.contains([ 'default', 'dev', 'production' ], type))
        throw new Error('type must be one of [dev, production, default].');

    // The bundle:$type gulp task
    let bundleType = 'bundle' +
        ((type === 'default')
        ? ''
        : `:${type}`);

    // The array of gulp tasks needed to complete the build
    return runSequence.apply(null, [
        'clean',
        [ bundleType, 'sass', 'assets', 'html', 'bootstrap', 'font-awesome' ],
    ].concat(tasks).concat(cb));
}

// Copy files, build bundle, and compile sass
gulp.task('default', (done) => {
    return build('default', done);
});

// Copy files, build bundle, and compile sass (no sourcemaps)
gulp.task('production', (done) => {
    return build('production', done);
});

// Clean the output dir
// Then bundle/compile and watch for changes
gulp.task('dev', (done) => {
    return build('dev', done, [ [ 'sass:dev', 'html:dev' ], 'server' ]);
});

/**
 * SERVER
 *
 * Starts a browsersync dev server.
 */

const bs = browserSync.create();
gulp.task('server', () => {
    bs.init({
        server: {
            baseDir: 'dist',
        }
    });
});
