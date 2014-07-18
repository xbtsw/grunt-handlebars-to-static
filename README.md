# grunt-handlebars-to-static

> grunt plugin to compile handlebars.js template into static files

## Getting Started
This plugin requires Grunt `~0.4.5`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-handlebars-to-static --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-handlebars-to-static');
```

In your project's Gruntfile, add a section named `handlebars_to_static` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  handlebars_to_static: {
    options: {
      // Task-specific options go here.
    },
    your_target: {
      // Target-specific file lists and/or options go here.
    },
  },
});
```

To get started quickly, you can check out some [Examples](#usage-examples) of the task in action. Or you can dive into the 
[Detailed Doc](#options) to fully leverage the flexibility of this plugin.

## Options

#### options.global_context
Type: `Object`
Default value: 
```js
{
    data: {},
    helpers: {},
    partials: {}
}
```

The global [Context](#context) of handlebars execution for every template compilation.

#### options.file_context
Type: `Function`
Default value: A function that returns `{}`

A function that returns a file [Context](#context) of handlebars execution a template compilation. This gets merged
with `options.global_context` for each file before the final execution. The function signature is
```js
function file_context(src, dest, global_context)
```
* `src` is a string of current template file getting compiled
* `dest` is a string of output path
* `global_context` is a copy of `options.global_context`, the `helpers` and `partials` fields will be in their [1st form](#context) as mentioned in Context section.

The return value of the function is then [deep merged](http://lodash.com/docs#merge) with `options.global_context` before applied to the template, that means any primitive field exist both `options.global_context` and `options.file_context()`, the latter will have precedence. For example:

with global context like following
```js
options.global_context = {
	data: {
    	name: 'apple',
        attr: {
        	price: 5,
            color: 'red'
        }
    },
    helpers: {
        'helper1':func1
    },
    partials: {
    }
}   
```
and file context like following
```js
options.file_context = function(){
	return {
    	data: {attr: {price: 6}}
    }
}
```
the final execution context will be
```js
{
	data: {
    	name: 'apple',
        attr: {
        	price: 6,  //note it's 6 now
            color: 'red'
        }
    },
    helpers: {
        'helper1':func1
    },
    partials: {
    }
}   
```

**In addition**, the return object can have two `String` field `src` and `dest`, they will override the original `src` and `desc` passed in. That means if you specify another `src`, then the new `src` will became the template compiling. 

#### options.default_ext.ext
Type: `String`
Default value: `'.html'`

When you don't explicitly specify your output file extension (i.e. when you `dest` is a folder), this 
extension is assumed.

#### options.default_ext.extDot
Type: `String`
Default value: `'first'`

This has the same meaning as [Grunt extDot parameter](http://gruntjs.com/configuring-tasks#building-the-files-object-dynamically)
when applying ` options.default_ext.ext`

### Context

A `Context` is a object have `data`, `helpers` and `partials` field, 
[options.global_context](#options.global_context) is a `Context`, the return value of 
[options.file_context](#options.file_context) is a `Context` too.

#### Context.data
Type: `Object`

This is the same data that you would provide if you are using handlebars in your javascript code, 
as in

```js
var compiled_template = Handlebars.compile(tpl);
compiled_template(data); //same as this "data" here
```
note that you could put your data into a file like this

```js
// filename: data.js
'use strict';
var data = module.exports;

// some data, can be referred in templates by {{totalpage}}
data.totalpage = 2;

// some nested data, can be referred in templates by {{navibar.page}}
data.navibar.page = 2;

// some data from another file, relative to data.js
data.table_data = require('./table_data.js');

// do whatever crazy things you feel like
[1,2,3].forEach(function(v){
	data[v] = v;
}
```

assuming `data.js` is sitting alongside with your `gruntfile.js`, then you could load it
in your `gruntfile.js` like this

```js
global_context: {
    data: require('./data.js'),
    helpers: {},
    partials: {}
}
```
or return it in your `options.file_context`
```js
file_context: function(){
	return {
        data: require('./data.js')
    }
}
```
It's a useful way to modularize your template and data files.

#### Context.helpers
Type: 'Object'

This is the collection of helpers when executing handlebars, it can be one of the two forms

1. An object in the form of 
```js
{
    helper_name1: func1,
    helper_name2: func2,
    ...
}
```
in this case, the `helper_name1` part will become the name of the helper, the function itself is the helper code.

* Any of the three formats of [Grunt file format](http://gruntjs.com/configuring-tasks#files), however subject to [One-to-one restriction](#one-to-one-restriction)

	in this case, the `src` file is expected to be a nodejs module that export a single function to be used as the helper function, and `desc` will be converted to a dot-separated namespace, extension stripped. The extension stripping will respect the `extDot` option carried by the _Grunt file format_  itself, or as defined by `options.default_ext.extDot` when applicable. For example, a `dest` of `hp/navbar/item/makeitem.js` will be converted to `hp.navbar.item.makeitem` and be referenced in template as `{{hp.navbar.item.makeitem}}`.
    
    This way, you can easily control the namespacing of your helpers, by simply using _Grunt file format_ setting approciate `dest`。 

#### Context.partials

This is the collection of helpers when executing handlebars, it can be one of the three forms

1. An object in the form of 
```js
{
    partial_name1: func1,
    partial_name2: func2,
    ...
}
```
in this case, the `partial_name1` part will become the name of the partial, the function should be _compiled_ partial.
2. An object in the form of
```js
{
    partial_name1: string1,
    partial_name2: string2,
    ...
}
```
in this case, the `partial_name1` part will become the name of the partial, the function should be partial in `string`.
* Any of the three formats of [Grunt file format](http://gruntjs.com/configuring-tasks#files), however subject to [One-to-one restriction](#one-to-one-restriction)

	in this case the `src` expect to be a partial in a file, the `dest` will be converted to a dot-separated namespace, extension stripped, in the same fashion as `Context.helpers`
    
### One-to-one restriction

Whenever you specify a [Grunt file format](http://gruntjs.com/configuring-tasks#files) in this task, you should only map one `src` to one `dest` only. Since it doesn't make sense to:

* Compile multiple templates into one output file
* Assign multiple `helpers` under one name
* Assign multiple `partials` under one name (well, if you really want to concatenate `partials`, maybe you should run `grunt-contrib-concat` on them first)

This means, following formats are good:

* when you use `expand` in your file format, like
```js
// mapped helpers/some/path/somehelper.js => hp.some.path.somehelper
{expand: true, cwd: 'helpers/', src: '**/*.js', dest: 'hp'}
```
* when you map multiple files into a directory, the tree structure will be kept
```js
// mapped helpers/some/path/somehelper.js => JST.helpers.some.path.somehelper
{src: ['helpers/**/*.js'], dest: 'JST/'} //note ending with / means directory in Grunt file format
```

But following format is not good

* when `src` contain multiple file, but `dest` contain one file
```js
// mapped every .js in "helpers" to a single file "output"
{src: ['helpers/**/*.js'], dest: 'output'}
```
In this case the task will error out

## Usage Examples
### A set of template share common helpers and partials
Assume following folder structure
```
+---global_data.json
+---helpers
|   \---some
|       \---path
|           \---awesome_helper.js
+---html
|   +---page1.hbs
|   \---page2.hbs
\---partials
    \---some
        \---path
            \---awesome_partial.hbs
```
Then
```js
handlebars_to_static: {
	dev: {
		options: {
			global_context: {
            	// global data in a file
				data: require('./global_data.json'),
                // use helpers inside "helpers" folder for all files
                // take folder structure as namespace, putting all helpers inside "HP" namespace
				helpers: {expand: true, cwd: 'helpers/', src: '**/*.js', dest: 'HP'},
                // similar to above
				partials: {expand: true, cwd: 'partials/', src: '**/*.hbs', dest: 'PT'}
			}
		},
        // each template in html became a page
		src: ['global_setup/*.hbs'],
		dest: 'tmp/'
	}
}
```

The helpers and partials can then be referred in the page as `{{HP.some.path.awesome_helper param}}` and `{{>PT.some.path.awesome_partial}}`

### A set of pages (partials) share a same template
Sometimes, you have a set of pages which share a common template, in handlebar sense, the pages are partials and template is the one that is compiling.

Say you have a template
```html
<!-- general_template.hbs -->

I am a general template. Here's my headers

<!-- Content goes here -->
{{>body}}

Hi, footer here :)
```
```js
dev: {
	options:{
		file_context: function(src) {
			return {
            	//the src become a partial named "body"
				partials: {src: [src], dest: 'body'},
				src: 'general_template.hbs'
			};
		}
	},
	src: ['pages/*.hbs'],
	dest: 'tmp/'
}
```

Or if you have multiple parts
```html
<!-- general_template.hbs -->

{{>head}}
{{>body}}

Hi, footer here :)
```
```js
dev: {
	options:{
		file_context: function(src) {
			return {
				partials: {
                	head: grunt.file.read(src + '.head'),
                    body: grunt.file.read(src + '.body'),
                },
				src: 'general_template.hbs'
			};
		}
	},
	src: ['pages/*.hbs'],
	dest: 'tmp/'
}
```

### Variables depends on file
```js
dev: {
	options:{
    	global_context :{
        	data: {
            	title: 'Main page'
            },
        	partials: {
            	navbar: 'Page Title: {{title}}'
            }
        }
		file_context: function(src) {
			return {
				data: {
                	// will override global_context
                	title: cheerio.load(grunt.file.read(src))('h2.title').html(),
                    // some local data in a file alongside with "*.hbs"
                    add_data: require('./' + src + '.json')
                }
			};
		}
	},
	src: ['pages/*.hbs'],
	dest: 'tmp/'
}
```

### Non html files
```python
# Django settings.py

...

# SECURITY WARNING: don't run with debug turned on in production!
{{if is_dev}}

DEBUG = True

TEMPLATE_DEBUG = True

{{else}}

DEBUG = False

TEMPLATE_DEBUG = False

{{/if}}
...
```
```js
django: {
	options:{
    	file_context: function(){
        	return {
            	is_dev : grunt.task.current.args[0] === 'dev'
            }
        }
    },
	src: ['settings.py.hbs'],
	dest: 'settings.py'
}
```

```js
grunt handlebars_to_static:django:dev //gives dev version of settings.py
grunt handlebars_to_static:django:dist //gives dist version of settings.py
```


## Release History
0.1.0 Initial release

## License
MIT License

https://github.com/xbtsw/grunt-handlebars-to-static/blob/master/LICENSE
