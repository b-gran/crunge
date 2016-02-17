import _ from 'underscore';
import gulp from 'gulp';
import rename from 'gulp-rename';

import babelify from 'babelify';
import browserify from 'browserify';
import watchify from 'watchify';

import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import sourcemaps from 'gulp-sourcemaps';
import uglify from 'gulp-uglify';

import gutil from 'gulp-util';
import chalk from 'chalk';

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

const config = {
    entry: './src/js/client.js',
    babelOpts: {
        presets: [ 'es2015', 'react' ]
    },
};

gulp.task('watch', () => {
    let args = _.extend(watchify.args, { debug: true });
    let bundler = watchify(browserify(config.entry, args)).transform(babelify, config.babelOpts);
    createBundle(bundler);
    bundler.on('update', () => {
        createBundle(bundler);
    });
});

gulp.task('bundle', () => {
    let bundler = browserify(config.entry, { debug: true }).transform(babelify, config.babelOpts);
    return createBundle(bundler);
})

gulp.task('production', () => {
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

gulp.task('default', [ 'watch' ]);
