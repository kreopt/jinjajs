/*!
 * Jinja Templating for JavaScript with asyncronous template file loader v0.1.8
 * https://github.com/kreopt/jinjajs
 * Forked from https://github.com/sstur/jinja-js
 */
window.jinja = {};

//the context 'this' inside tag_handlers is the parser instance
jinja.tag_handlers = {};
jinja.filter_handlers = {};

var _toString = Object.prototype.toString;
var _hasOwnProperty = Object.prototype.hasOwnProperty;
var toString = function (val) {
    if (val == null) return '';
    return (typeof val.toString == 'function') ? val.toString() : _toString.call(val);
};

var getRuntime = function runtime(data, opts) {
    var defaults = {autoEscape: 'html'};
    var extend = function (dest, src) {
        Object.keys(src).forEach(function (key) {
            dest[key] = src[key];
        });
        return dest;
    };
    //get a value, lexically, starting in current context; a.b -> get("a","b")
    var get = function () {
        var val, n = arguments[0], c = stack.length;
        while (c--) {
            val = stack[c][n];
            if (typeof val != 'undefined') break;
        }
        for (var i = 1, len = arguments.length; i < len; i++) {
            if (val == null) continue;
            n = arguments[i];
            val = (_hasOwnProperty.call(val, n)) ? val[n] : (typeof val._get == 'function' ? (val[n] = val._get(n)) : null);
        }
        return (val == null) ? null : val;
    };
    var set = function (n, val) {
        stack[stack.length - 1][n] = val;
    };
    var push = function (ctx) {
        stack.push(ctx || {});
    };
    var pop = function () {
        stack.pop();
    };
    var write = function (str) {
        output.push(str);
    };
    var filter = function (val) {
        for (var i = 1, len = arguments.length; i < len; i++) {
            var arr = arguments[i], name = arr[0], filter = jinja.filter_handlers[name];
            if (filter) {
                arr[0] = val;
                //now arr looks like [val, arg1, arg2]
                val = filter.apply(data, arr);
            } else {
                throw new Error('Invalid filter: ' + name);
            }
        }
        if (opts.autoEscape && name != opts.autoEscape && name != 'safe') {
            //auto escape if not explicitly safe or already escaped
            val = jinja.filter_handlers[opts.autoEscape].call(data, val);
        }
        output.push(val);
    };
    var each = function (obj, loopvar, fn1, fn2) {
        if (obj == null) return;
        var arr = Array.isArray(obj) ? obj : Object.keys(obj), len = arr.length;
        var ctx = {loop: {length: len, first: arr[0], last: arr[len - 1]}};
        push(ctx);
        for (var i = 0; i < len; i++) {
            extend(ctx.loop, {index: i + 1, index0: i});
            fn1(ctx[loopvar] = arr[i]);
        }
        if (len == 0 && fn2) fn2();
        pop();
    };
    var block = function (fn) {
        push();
        fn();
        pop();
    };
    var render = function () {
        return output.join('');
    };
    data = data || {};
    opts = extend(defaults, opts || {});
    var stack = [Object.create(data || {})], output = [];
    return {get: get, set: set, push: push, pop: pop, write: write, filter: filter, each: each, block: block, render: render};
};

var runtime;

jinja.make_tag = function(name, handler){
    if (typeof handler == typeof ''){
        jinja.tag_handlers[name] = jinja.tag_handlers[handler];
    } else {
        jinja.tag_handlers[name] = handler;
    }
};
jinja.make_filter = function(name, filter){
    if (jinja.filter_handlers.name) {console.warn('Filter '+name+' already exists. Overriding.');}
    jinja.filter_handlers[name] = filter;
};

jinja.compile = function (markup, opts) {
    var _this = this;
    return new Promise(function (resolve, reject) {
        opts = opts || {};
        var parser = new Parser();
        parser.readTemplateFile = _this.readTemplateFile;
        var code = [];
        code.push('function render($) {');
        code.push('var get = $.get, set = $.set, push = $.push, pop = $.pop, write = $.write, filter = $.filter, each = $.each, block = $.block;');
        parser.parse(markup).then(function (html) {
            code.push.apply(code, html);
            code.push('return $.render();');
            code.push('}');
            code = code.join('\n');
            if (opts.runtime === false) {
                var fn = new Function('data', 'options', 'return (' + code + ')(runtime(data, options))');
            } else {
                runtime = runtime || (runtime = getRuntime.toString());
                fn = new Function('data', 'options', 'return (' + code + ')((' + runtime + ')(data, options))');
            }
            resolve({render: fn});
        });
    });
};

jinja.render = function (markup, data, opts) {
    return new Promise(function(resolve, reject){
        var awaiting_data={};
        var promises=[];
        for (var d in data){
            if (data[d] instanceof Promise){
                awaiting_data[d] = promises.length;
                promises.push(data[d]);
            }
        }

        Promise.all(promises).then(function(values){

            for (var d in awaiting_data){
                data[d] = values[awaiting_data[d]];
            }

            jinja.compile(markup).then(function (tmpl) {
                resolve(tmpl.render(data, opts));
            });
        }).catch(function(e){
            console.error(e);
        });
    })
};

jinja.templateFiles = {};
jinja.template_url = '/templates/';

jinja.readTemplateFile = function (name) {
    return new Promise(function (resolve, reject) {
        var templateFiles = jinja.templateFiles || {};
        var templateFile = templateFiles[name];
        if (templateFile == null) {
            $.get(jinja.template_url + name, function (html) {
                jinja.templateFiles[name] = html;
                resolve(html);
            }).fail(function () {
                reject('Template file not found: ' + name);
            });
        } else {
            resolve(templateFile);
        }
    });
};
