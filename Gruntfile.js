module.exports = function(grunt) {
  'use strict';

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    uglify: {
      dev: {
        options: {
          mangle: false,
          compress: false,
          preserveComments: 'all',
          beautify: true
        },
        files: {
          'site/static/js/polyfills.js': ['js/vendor/picturefill.js', 'js/vendor/augment.js'],
          'site/static/js/wildlife.js': ['js/wildlife.js'],
          'site/static/js/federal-register.js': ['js/federal-register.js'],
          'site/static/js/jobs.js': ['js/jobs.js'],
          'site/static/js/atRisk.js': ['js/atRisk.js'],
          'site/static/js/permits.js': ['js/vendor/angular.min.js', 'js/permits.js'],
          'site/static/js/about.js': ['js/vendor/jquery.easyModal.js', 'js/about.js'],
          'site/static/js/office-list.js': ['js/office-list.js'],
          'site/static/js/offices.js': ['js/offices.js'],
          'site/static/js/map.js': [
            'js/vendor/leaflet.js', 
            'js/vendor/leaflet.markercluster.min.js', 
            'js/vendor/jquery.easyModal.js', 
            'js/vendor/jquery-autocomplete.min.js', 
            'js/vendor/underscore.js',
            'js/map.js'
          ],
        }
      },
      dist: {
        options: {
          mangle: true,
          compress: true,
          banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
                  '<%= grunt.template.today("yyyy-mm-dd") %> */'
        },
        files: '<%= uglify.dev.files %>'
      }
    },

    shell: {
      hugo: {
        command: function(target) {
          if (target === 'dev') {
            return 'hugo --baseUrl=http://127.0.0.1 --buildDrafts=true --buildFuture=true --source=site --destination=../build/dev';
          } else {
            return 'hugo --source=site --destination=../build/dist';
          }
        }
      }
    },

    connect: {
      dev: {
        options: {
          hostname: '127.0.0.1',
          port: '80',
          protocol: 'http',
          base: 'build/dev',
          livereload: true
        }
      }
    },

    sass: {
      dev: {
        options: {
          sourceMap: true
        },
        files: {
          'scss/unprefixed/styles.css': 'scss/styles.scss',
          'scss/unprefixed/map.css': 'scss/map.scss'
        }
      },
      dist: {
        options: {
          outputStyle: 'compressed'
        },
        files: '<% sass.dev.files %>'
      }
    },

    autoprefixer: {
      all: {
        expand: true,
        flatten: true,
        src: 'scss/unprefixed/*.css',
        dest: 'site/static/css/'
      }
    },

    jshint: {
      files: ['Gruntfile.js', 'js/**/*.js', '!js/vendor/*.js'],
      options: {
        reporter: require('jshint-stylish'),
        force: true,
        globals: {
          jQuery: true
        }
      }
    },

    clean: {
      dev: ['build/dev/**/*'],
      dist: ['build/dist**/*']
    },

    watch: {
      options: {
        livereload: true
      },
      site: {
        files: ['site/**/*'],
        tasks: ['shell:hugo:dev']
      },
      js: {
        files: ['<%= jshint.files %>'],
        tasks: ['newer:jshint', 'newer:uglify:dev', 'shell:hugo:dev']
      },
      sass: {
        files: ['scss/**/*.scss'],
        tasks: ['sass:dev', 'autoprefixer:all', 'shell:hugo:dev']
      }
    }
  });

  require('load-grunt-tasks')(grunt);

  grunt.registerTask('default', ['clean:dev', 'connect:dev', 'jshint', 'uglify:dev', 'sass:dev', 'autoprefixer:all', 'shell:hugo:dev', 'watch']);
  grunt.registerTask('build', ['clean:dist', 'jshint','uglify:dist', 'sass:dist', 'autoprefixer:all', 'shell:hugo']);

};