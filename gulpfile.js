var gulp = require('gulp');
var concat = require('gulp-concat');
var wrap = require('gulp-wrap');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');

var out_file_name = 'jinja.js';
var out_file_name_min = 'jinja.min.js';
var out_dir = './';
var source_dir = './src/';

var build_modules = [
    'parser.js',
    'jinja.js',
    'loaders/ajax.js',
    'filters/*.js',
    'tags/*.js'];

for (var i= 0,len=build_modules.length; i<len;i++){
    build_modules[i]=source_dir+build_modules[i];
}

// Конкатенация и минификация файлов
gulp.task('minify', function(){
    gulp.src(build_modules)
        .pipe(sourcemaps.init())
        .pipe(concat(out_file_name_min))
        .pipe(wrap('(function(){<%= contents %>}());'))
        .pipe(uglify({outSourceMap: true}))
        .pipe(sourcemaps.write(out_dir))
        .pipe(gulp.dest(out_dir));
});

gulp.task('build', function(){
    gulp.src(build_modules)
        .pipe(sourcemaps.init())
        .pipe(concat(out_file_name))
        .pipe(wrap('(function(){<%= contents %>}());'))
        .pipe(sourcemaps.write(out_dir))
        .pipe(gulp.dest(out_dir));
});

gulp.task('watch', function(){

    // Отслеживаем изменения в файлах
    gulp.watch("src/**",['build', 'minify']);

});
// Действия по умолчанию
gulp.task('default', ['minify', 'build', 'watch']);
