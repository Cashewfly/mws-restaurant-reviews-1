//Using this as a guide
//
//https://github.com/yeoman/generator-webapp/blob/master/docs/recipes/browserify.md
//
//I'm going to have all my javascript sources in ./sources-master and put the modified scripts
//in ./js/.  sw.js has to be in the ./ for it to work correctly, so I have to figure out 
//how to do that.
//
//At the moment, all I want to accomplish is to import idb

const gulp       = require('gulp');
const browserify = require('browserify');
const source     = require('vinyl-source-stream');

gulp.task('scripts', function() {
  return browserify({
    entries: 'sw.js',  // this is your source, you need to write this file
  })
  .bundle()
  .pipe(source('sw-compiled.js'))  // this is the output file name
  .pipe(gulp.dest('./test'));  // write the file to this path (you could use dist/, output/, etc)
});

gulp.task('default', ['scripts']);
