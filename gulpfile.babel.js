import _ from 'underscore';
import gulp from 'gulp';
import rename from 'gulp-rename';
import del from 'del';

import babelify from 'babelify';
import browserify from 'browserify';
import watchify from 'watchify';

import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import sourcemaps from 'gulp-sourcemaps';
import uglify from 'gulp-uglify';
import runSequence from 'run-sequence';
import sass from 'gulp-sass';

import gutil from 'gulp-util';
import chalk from 'chalk';

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
    let shortPath = 'src' + evt.path.split('src').reduce((prev, current) => current);
    gutil.log(
        'File ' +
        chalk.green(shortPath) +
        ' was ' +
        chalk.blue(evt.type) +
        '. Rebuilding...'
    );
};

// rm -rf the dist directory
gulp.task('clean', () => {
    return del([ 'dist/**/*' ]);
});

// Generate a bundle from a browserify/watchify bundle
function createBundle (bundler) {
    return bundler.bundle()
        .on('error', mapError)
        .pipe(source('app.js'))
        .pipe(buffer())
        .pipe(gulp.dest('./dist/js'))
        .pipe(rename('app.min.js'))
        .pipe(sourcemaps.init({ loadMaps: true }))
            .pipe(uglify())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist/js'));
};

// Constants
const config = {
    // App entry
    entry: './src/js/client.js',

    // Supported langauges
    babelOpts: {
        presets: [ 'es2015', 'react' ]
    },
};

// Generate a browserify bundle
gulp.task('bundle', () => {
    let bundler = browserify(config.entry, { debug: true }).transform(babelify, config.babelOpts);
    return createBundle(bundler);
});

// Generate a browserify bundle, watch for changes, and rebuild
gulp.task('bundle:dev', () => {
    let args = _.extend(watchify.args, { debug: true });
    let bundler = watchify(browserify(config.entry, args)).transform(babelify, config.babelOpts);

    createBundle(bundler);
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

// Just copy index.html to the dist directory
gulp.task('copy:index', () => {
    return gulp
        .src('src/index.html')
        .pipe(gulp.dest('dist'));
});

// Copies the bootstrap files from node_modules/ to dist/
gulp.task('bootstrap', (done) => {
    return runSequence(
        [ 'bootstrap:css', 'bootstrap:fonts' ],
        done
    );
})

// Copies bootstrap css only
gulp.task('bootstrap:css', () => {
    return gulp.src([
            './node_modules/bootstrap/dist/css/bootstrap.min.css',
            './node_modules/bootstrap/dist/css/bootstrap.min.css.map', ])
        .pipe(gulp.dest('dist/css'));
});

// Copies bootstrap fonts only
gulp.task('bootstrap:fonts', () => {
    return gulp
        .src('./node_modules/bootstrap/dist/fonts/**/*')
        .pipe(gulp.dest('dist/fonts'));
});

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

// The dev, dev+watch, and production builds are almost identical.
// The only difference is watch and sourcemaps.
//
// type is the bundle type to build (e.g. bundle:dev, bundle:production bundle)
//
// tasks is an optional array of gulp tasks to run after the build is complete
// tasks should be in a format runSequence will understand.
function build (type, cb, tasks) {
    if (!_.contains([ 'default', 'dev', 'production' ], type))
        throw new Error('type must be one of [dev, production, default].');

    // The bundle:$type gulp task
    let bundleType = 'bundle' +
        ((type === '')
        ? ''
        : `:${type}`);

    console.log('bundleType', bundleType);

    // An array of gulp tasks to run the build
    return runSequence.apply(null, [
        'clean',
        [ bundleType, 'sass', 'copy:index', 'bootstrap' ],
    ].concat(tasks || []).concat(cb));
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
    return build('dev', done, [ 'sass:dev']);
});

/*
// Copy files, build bundle, and compile sass
gulp.task('default', (done) => {
    return runSequence(
        'clean',
        [ 'bundle', 'sass', 'copy:index', 'bootstrap' ],
        done
    );
});

// Copy files, build bundle, and compile sass (no sourcemaps)
gulp.task('production', (done) => {
    return runSequence(
        'clean',
        [ 'bundle:production', 'sass', 'copy:index', 'bootstrap' ],
        done
    );
});

// Clean the output dir
// Then bundle/compile and watch for changes
gulp.task('dev', (done) => {
    return runSequence(
        'clean',
        [ 'bundle:dev', 'sass', 'copy:index', 'bootstrap' ],
        'sass:dev',
        done
    );
});
*/
