import gulp     from 'gulp';
import connect  from 'gulp-connect';
import plugins  from 'gulp-load-plugins';
import browser  from 'browser-sync';
import rimraf   from 'rimraf';
import panini   from 'panini';
import yargs    from 'yargs';
import lazypipe from 'lazypipe';
import inky     from 'inky';
import fs       from 'fs';
import siphon   from 'siphon-media-query';
import path     from 'path';
import merge    from 'merge-stream';
import beep     from 'beepbeep';
import colors   from 'colors';

const $ = plugins();

// Look for the --production flag
const PRODUCTION = !!(yargs.argv.production);
const EMAIL = yargs.argv.to;

// Declar var so that both AWS and Litmus task can use it.
var CONFIG;

// Build the "dist" folder for Heroku
gulp.task('heroku',
  gulp.series(clean, ui, pages, uiSass, sass, highlightCSS, js, images, inline, server, watch));

// Build the "dist" folder by running all of the above tasks
gulp.task('build',
  gulp.series(clean, pages, sass, images, inline));

// Build the UI for the email generator
gulp.task('ui',
  gulp.series(clean, ui, pages, uiSass, sass, highlightCSS, js, images, inline, server, watch));

// Build emails, run the server, and watch for file changes
gulp.task('default',
  gulp.series('build', server, watch));

// Build emails, then send to litmus
gulp.task('litmus',
  gulp.series('build', creds, aws, litmus));

// Build emails, then send to litmus
gulp.task('mail',
  gulp.series('build', creds, aws, mail));

// Build emails, then zip
gulp.task('zip',
  gulp.series('build', zip));

gulp.task('postD', function() {
  console.log('got postD');
});

// Delete the "dist" folder
// This happens every time a build starts
function clean(done) {
  rimraf('dist', done);
}

// Compile layouts, pages, and partials into flat HTML files
// Then parse using Inky templates
function pages() {
  return gulp.src('src/pages/**/*.html')
    .pipe(panini({
      root: 'src/pages',
      layouts: 'src/layouts',
      partials: 'src/partials',
      helpers: 'src/helpers'
    }))
    .pipe(inky())
    .pipe(gulp.dest('dist'));
}
// Take the pages panini output 

// Index file for the UI
function ui() {
  return gulp.src('src/ui/**/*.html')
    .pipe(gulp.dest('dist'));
}

// Reset Panini's cache of layouts and partials
function resetPages(done) {
  panini.refresh();
  done();
}

// Compile Sass for the UI - aka Pull the Foundation Sites Sass for the UI
function uiSass() {
  return gulp.src('src/assets/scss/app.scss')
    .pipe($.sass({
      includePaths: ['bower_components/foundation-sites/scss']
    }).on('error', $.sass.logError))
    .pipe(gulp.dest('dist/css'));
}

// TODO concat this with app.scss
function highlightCSS() {
  return gulp.src('src/assets/css/**/*')
    .pipe(gulp.dest('dist/css'));
}

// Compile Sass into CSS
function sass() {
  return gulp.src('src/assets/scss/email.scss')
    .pipe($.if(!PRODUCTION, $.sourcemaps.init()))
    .pipe($.sass({
      includePaths: ['node_modules/foundation-emails/scss']
    }).on('error', $.sass.logError))
    .pipe($.if(PRODUCTION, $.uncss(
      {
        html: ['dist/**/*.html', '!dist/index.html']
      })))
    .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
    .pipe(gulp.dest('dist/css'));
}

// Copy and compress images
function images() {
  return gulp.src('src/assets/img/**/*')
    .pipe($.imagemin())
    .pipe(gulp.dest('./dist/assets/img'));
}

// Copy JS
function js() {
  return gulp.src('src/assets/js/**/*')
    .pipe(gulp.dest('./dist/assets/js'));
}

// Inline CSS and minify HTML
function inline() {
  return gulp.src(['dist/**/*.html', '!dist/index.html'])
    .pipe($.if(PRODUCTION, inliner('dist/css/email.css')))
    .pipe(gulp.dest('dist'));
}

// Start a webserver for Heroku
function web(done) {
  connect.server({
    root: 'dist',
    port: process.env.PORT || 5000, // localhost:5000
    livereload: false
  });
  done();
}

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};


// Start a server with LiveReload to preview the site in
function server(done) {
  browser.init({
    open: false,
    server: 'dist',
    ghostMode: false,
    port: process.env.PORT || 5000,
    middleware: [
        {
            route: "/api",
            handle: function (req, res, next) {
                // handle any requests at /api TODO: Break into it's own file
                var formData, formArr = [], newVal = [], selectedVersion, selectedSite = "sdc";
                req.on('data', function(chunk) {
                  formData = chunk.toString();
                  formArr = formData.split('&');

                  var fs = require('fs');
                  var gulp = require('gulp');

                  if(formArr[0].substr(0, formArr[0].indexOf("=")) === "site") {
                    selectedSite = formArr[0].substr(formArr[0].indexOf("=") + 1);
                  }
                  

                  //read from page data
                  
                  var pageData = fs.readFileSync('src/pages/' + selectedSite + '.html', 'utf-8');
                  // Loop through all the form data, keep replacing the newData array
                  for(var i=0; i<formArr.length; i++){
                      var formValue = formArr[i].substr(formArr[i].indexOf("=") + 1),
                      formProp = formArr[i].substr(0, formArr[i].indexOf("="));
                      var formValueStripped = unescape(formValue.replaceAll('+', ' '));
                      if(formProp === "selected-version") {
                        selectedVersion = formValue;
                      }
                      // TODO: Break this into a function and repeat twice instead of repeating code
                      if(i === 0) {
                          var fullFormProp = pageData.substr(pageData.indexOf(formProp), pageData.substr(pageData.indexOf(formProp), pageData.length).indexOf('#'));
                          if(pageData.indexOf(formProp) > -1){
                            newVal[i] = pageData.replace(fullFormProp, formProp + ": " + formValueStripped + " ");
                          } else {
                            newVal[i] = pageData;
                          }
                      } else {
                          var fullFormProp = newVal[i-1].substr(newVal[i-1].indexOf(formProp), newVal[i-1].substr(newVal[i-1].indexOf(formProp), newVal[i-1].length).indexOf('#'));
                          if(newVal[i-1].indexOf(formProp) > -1){
                            newVal[i] = newVal[i-1].replace(fullFormProp, formProp + ": " + formValueStripped + " ");
                          } else {
                            newVal[i] = newVal[i-1];
                          }
                      }
                  }
                  var fileLoc = 'src/pages/' + selectedVersion + '.html';
                  //write to the file
                  fs.writeFile(fileLoc, newVal[formArr.length - 1], function (err) {
                      if (err) throw err;
                      //console.log(newVal[formArr.length - 1]);
                      console.log('It\'s saved! in same location.' + fileLoc);
                  });
                });

                res.end();
                next();
            }
        }
    ]
  });
  done();
}

// Watch for file changes
function watch() {
  gulp.watch('src/pages/**/*.html').on('all', gulp.series(pages, inline, browser.reload));
  gulp.watch('src/ui/**/*.html').on('all', gulp.series(ui, browser.reload));
  gulp.watch(['src/layouts/**/*', 'src/partials/**/*']).on('all', gulp.series(resetPages, pages, inline, browser.reload));
  gulp.watch(['../scss/**/*.scss', 'src/assets/scss/**/*.scss']).on('all', gulp.series(resetPages, sass, uiSass, pages, inline, browser.reload));
  gulp.watch('src/assets/js/**/*').on('all', gulp.series(js, browser.reload));
  gulp.watch('src/assets/img/**/*').on('all', gulp.series(images, browser.reload));
}

// Inlines CSS into HTML, adds media query CSS into the <style> tag of the email, and compresses the HTML
function inliner(css) {
  var css = fs.readFileSync(css).toString();
  var mqCss = siphon(css);

  var pipe = lazypipe()
    .pipe($.inlineCss, {
      applyStyleTags: false,
      removeStyleTags: true,
      preserveMediaQueries: true,
      removeLinkTags: false
    })
    .pipe($.replace, '<!-- <style> -->', `<style>${mqCss}</style>`)
    .pipe($.replace, '<link rel="stylesheet" type="text/css" href="css/email.css">', '')
    .pipe($.htmlmin, {
      collapseWhitespace: true,
      minifyCSS: true
    });

  return pipe();
}

// Ensure creds for Litmus are at least there.
function creds(done) {
  var configPath = './config.json';
  try { CONFIG = JSON.parse(fs.readFileSync(configPath)); }
  catch(e) {
    beep();
    console.log('[AWS]'.bold.red + ' Sorry, there was an issue locating your config.json. Please see README.md');
    process.exit();
  }
  done();
}

// Post images to AWS S3 so they are accessible to Litmus and manual test
function aws() {
  var publisher = !!CONFIG.aws ? $.awspublish.create(CONFIG.aws) : $.awspublish.create();
  var headers = {
    'Cache-Control': 'max-age=315360000, no-transform, public'
  };

  return gulp.src('./dist/assets/img/*')
    // publisher will add Content-Length, Content-Type and headers specified above
    // If not specified it will set x-amz-acl to public-read by default
    .pipe(publisher.publish(headers))

    // create a cache file to speed up consecutive uploads
    //.pipe(publisher.cache())

    // print upload updates to console
    .pipe($.awspublish.reporter());
}

// Send email to Litmus for testing. If no AWS creds then do not replace img urls.
function litmus() {
  var awsURL = !!CONFIG && !!CONFIG.aws && !!CONFIG.aws.url ? CONFIG.aws.url : false;

  return gulp.src('dist/**/*.html')
    .pipe($.if(!!awsURL, $.replace(/=('|")(\/?assets\/img)/g, "=$1"+ awsURL)))
    .pipe($.litmus(CONFIG.litmus))
    .pipe(gulp.dest('dist'));
}

// Send email to specified email for testing. If no AWS creds then do not replace img urls.
function mail() {
  var awsURL = !!CONFIG && !!CONFIG.aws && !!CONFIG.aws.url ? CONFIG.aws.url : false;

  if (EMAIL) {
    CONFIG.mail.to = [EMAIL];
  }

  return gulp.src('dist/**/*.html')
    .pipe($.if(!!awsURL, $.replace(/=('|")(\/?assets\/img)/g, "=$1"+ awsURL)))
    .pipe($.mail(CONFIG.mail))
    .pipe(gulp.dest('dist'));
}

// Copy and compress into Zip
function zip() {
  var dist = 'dist';
  var ext = '.html';

  function getHtmlFiles(dir) {
    return fs.readdirSync(dir)
      .filter(function(file) {
        var fileExt = path.join(dir, file);
        var isHtml = path.extname(fileExt) == ext;
        return fs.statSync(fileExt).isFile() && isHtml;
      });
  }

  var htmlFiles = getHtmlFiles(dist);

  var moveTasks = htmlFiles.map(function(file){
    var sourcePath = path.join(dist, file);
    var fileName = path.basename(sourcePath, ext);

    var moveHTML = gulp.src(sourcePath)
      .pipe($.rename(function (path) {
        path.dirname = fileName;
        return path;
      }));

    var moveImages = gulp.src(sourcePath)
      .pipe($.htmlSrc({ selector: 'img'}))
      .pipe($.rename(function (path) {
        path.dirname = fileName + '/' + path.dirname;
        return path;
      }));

    return merge(moveHTML, moveImages)
      .pipe($.zip(fileName+ '.zip'))
      .pipe(gulp.dest('dist'));
  });

  return merge(moveTasks);
}