/*
 * grunt-handlebars-to-static
 * https://github.com/xbtsw/grunt-handlebars-to-static
 *
 * Copyright (c) 2014 Wei Chen
 * Licensed under the MIT license.
 */

'use strict';
var _ = require('underscore');
var hb = require('handlebars');
var extendify = require('extendify');
var merge = extendify({
    inPlace: false,
    arrays: 'replace'
});

// would be nice if below are exposed by grunt
var extDotRe = {
    first: /(\.[^\/]*)?$/,
    last: /(\.[^\/\.]*)?$/
};
// Windows?
var win32 = process.platform === 'win32';

// Normalize \\ paths to / paths.
var unixifyPath = function(filepath) {
    if (win32) {
        return filepath.replace(/\\/g, '/');
    } else {
        return filepath;
    }
};

function get_cwd(){
    return unixifyPath(process.cwd());
}

function filter_non_function(obj, error_warn) {
    Object.keys(obj).map(function (k) {
        if (!_.isFunction(obj[k])) {
            error_warn(k);
            delete obj[k];
        }
    });
    return obj;
}

function is_function_map(obj) {
    return Object.keys(obj).reduce(function (prev, k) {
        return prev && _.isFunction(obj[k]);
    }, true);
}

function is_string_map(obj) {
    return Object.keys(obj).reduce(function (prev, k) {
        return prev && _.isString(obj[k]);
    }, true);
}

function is_file_group(obj) {
    return _.isArray(obj.src) && _.isString(obj.dest);
}

function is_helper(obj){
    return is_function_map(obj) && !is_file_group(obj);
}

var is_partial = function (obj) {
    return (is_function_map(obj) || is_string_map(obj)) && !is_file_group(obj);
};

function is_dest_folder(dest) {
    return dest.slice(-1) === '/';
}

function make_namespace(file_obj) {
    //dest is used to decide namespace
    // would be nice if this is normalized by grunt, for now, just copy
    var ext_dot = file_obj.extDot ? file_obj.extDot : 'first';
    return file_obj.dest
        .replace(extDotRe[ext_dot], '')
        .replace(/\//g, '.');
}

module.exports = function (grunt) {

    function check_file_group(obj){
        if (!is_file_group(obj)){
            grunt.fail.fatal(JSON.stringify(obj) + 'is not a valid file definition group, check if forgot "src" or "desc"?');
        }
    }

    function make_absolute(path){
        if(!grunt.file.isPathAbsolute(path)){
            return get_cwd() + '/' + path;
        }
    }

    function filter_non_exist_src_file(file_objs) {
        return file_objs.filter(function (file) {
            // Warn on and remove invalid source files (if nonull was set).
            if (!grunt.file.exists(file.src)) {
                grunt.log.warn('Source file "' + file.src + '" not found, will be ignored');
                return false;
            } else {
                return true;
            }
        });
    }

    grunt.registerMultiTask('handlebars_to_static', 'grunt plugin to compile handlebars.js templates into static files', function () {
        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
            global_context: {
                data: {},
                helpers: {},
                partials: {}
            },
            default_ext: {
                ext: '.html',
                extDot: 'first'
            },
            //The default file context is empty
            file_context: function () {
                return {};
            }
        });

        function normalize_file_path(file_group) {
            // do some checking first since normalizeMultiTaskFiles is not fail safe
            check_file_group(file_group);
            // few possibilities here.
            if (file_group.src.length >= 1 && is_dest_folder(file_group.dest)) {
                //preserve folder structure and substitute extension
                return file_group.src.map(function (src) {
                    return {
                        src: src,
                        dest: file_group.dest + src.replace(extDotRe[options.default_ext.extDot], options.default_ext.ext),
                        extDot: options.default_ext.extDot
                    };
                });
            } else if (file_group.src.length > 1 && !is_dest_folder(file_group.dest)) {
                grunt.fail.fatal('Cannot compile multiple src files into a single dest ' + file_group.dest);
            } else if (file_group.src.length === 1 && !is_dest_folder(file_group.dest)) {
                //an "extended" file group here
                return [
                    {
                        src: file_group.src[0],
                        dest: file_group.dest,
                        extDot: file_group.orig.extDot
                    }
                ];
            } else {
                grunt.fail.fatal('Cannot understand the file input format for dest ' + file_group.dest);
            }
        }

        function process_helpers(obj) {
            var helper_obj = {};

            if (!is_helper(obj)) {
                //assume file obj here
                var files = grunt.task.normalizeMultiTaskFiles(obj);
                files = files.reduce(function (prev, file_group) {
                    return prev.concat(normalize_file_path(file_group));
                }, []);
                files = filter_non_exist_src_file(files);
                files.map(function (file_obj) {
                    helper_obj[make_namespace(file_obj)] = require(make_absolute(file_obj.src));
                });
            } else {
                helper_obj = obj;
            }

            return filter_non_function(helper_obj, function (key) {
                grunt.log.warn('The helper named ' + key + ' does not seem like a helper function in the option given, it will be ignored');
            });

        }

        function process_partials(obj) {
            var partial_obj = {};

            if (!is_partial(obj)) {
                //assume file obj here
                var files = grunt.task.normalizeMultiTaskFiles(obj);
                files = files.reduce(function (prev, file_group) {
                    return prev.concat(normalize_file_path(file_group));
                }, []);
                files = filter_non_exist_src_file(files);
                files.map(function (f) {
                    partial_obj[make_namespace(f)] = hb.compile(grunt.file.read(f.src));
                });
            } else {
                if (is_string_map(obj)) {
                    //bunch of strings, needs compile
                    Object.keys(obj).map(function (k) {
                        partial_obj[k] = hb.compile(obj[k]);
                    });
                }
            }
            return partial_obj;
        }

        // process global context once here
        if(options.global_context.helpers) options.global_context.helpers = process_helpers(options.global_context.helpers);
        if(options.global_context.partials) options.global_context.partials = process_partials(options.global_context.partials);

        // validate
        if (['first', 'last'].indexOf(options.default_ext.extDot) === -1) {
            grunt.fail.fatal('options.default_ext.extDot invalid value: ' + options.default_ext.extDot);
        }

        // Iterate over all specified file groups.
        this.files.map(function (file_group) {
            normalize_file_path(file_group)
                .map(function (file_obj) {
                    var src = file_obj.src;
                    var dest = file_obj.dest;
                    var file_context = {
                        data: {},
                        helpers: {},
                        partials: {},
                        src: false,
                        desc: false
                    };
                    _.extend(file_context, options.file_context(
                        src,
                        dest,
                        merge({}, options.global_context)
                    ));

                    if (file_context.src){
                        src = file_context.src;
                    }
                    if (file_context.dest){
                        dest = file_context.dest;
                    }
                    delete file_context.src;
                    delete file_context.dest;

                    file_context.helpers = process_helpers(file_context.helpers);
                    file_context.partials = process_partials(file_context.partials);
                    var context = merge(options.global_context, file_context);
                    grunt.file.write(
                        dest,
                        hb.compile(grunt.file.read(src))(context.data, {
                            helpers: context.helpers,
                            partials: context.partials
                        }));
                    grunt.log.writeln('File "' + file_obj.dest + '" created.');
                });
        });
    });
};
