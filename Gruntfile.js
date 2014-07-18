/*
 * grunt-handlebars-to-static
 * https://github.com/xbtsw/grunt-handlebars-to-static
 *
 * Copyright (c) 2014 Wei Chen
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        jshint: {
            all: [
                'Gruntfile.js',
                'tasks/*.js',
                '<%= nodeunit.tests %>'
            ],
            options: {
                jshintrc: '.jshintrc'
            }
        },

        // Before generating any new files, remove any previously-created files.
        clean: {
            tests: ['tmp']
        },

        // Configuration to be run (and then tested).
        handlebars_to_static: {
            global_setup: {
                options: {
                    global_context: {
                        data: require('./examples/global_setup/global_data.js'),
                        helpers: {expand: true, cwd: 'examples/global_setup/helpers', src: '**/*.js', dest: 'hp'},
                        partials: {expand: true, cwd: 'examples/global_setup/partials', src: '**/*.hbs', dest: 'pt'}
                    },
                    file_context: function (src) {
                        return {
                            data: {pagenumber: src.slice(-5, -4)}
                        };
                    }
                },
                src: ['examples/global_setup/*.hbs'],
                dest: 'tmp/'
            },
            inverse_setup: {
                options:{
                    file_context: function(src) {
                        return {
                            partials: {src: [src], dest: 'body'},
                            src: 'examples/inverse_setup/template/general_template.hbs'
                        };
                    }
                },
                src: ['examples/inverse_setup/pages/*.hbs'],
                dest: 'tmp/'
            }
        },

        // Unit tests.
        nodeunit: {
            tests: ['test/*_test.js']
        }

    });

    // Actually load this plugin's task(s).
    grunt.loadTasks('tasks');

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-nodeunit');

    // Whenever the "test" task is run, first clean the "tmp" dir, then run this
    // plugin's task(s), then test the result.
    grunt.registerTask('test', ['clean', 'handlebars_to_static', 'nodeunit']);

    // By default, lint and run all tests.
    grunt.registerTask('default', ['jshint', 'test']);

};
