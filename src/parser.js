var STRINGS = /'(\\.|[^'])*'|"(\\.|[^"'"])*"/g;
var IDENTS_AND_NUMS = /([$_a-z][$\w]*)|([+-]?\d+(\.\d+)?)/g;
var NUMBER = /^[+-]?\d+(\.\d+)?$/;
//non-primitive literals (array and object literals)
var NON_PRIMITIVES = /\[[@#~](,[@#~])*\]|\[\]|\{([@i]:[@#~])(,[@i]:[@#~])*\}|\{\}/g;
//bare identifiers such as variables and in object literals: {foo: 'value'}
var IDENTIFIERS = /[$_a-z][$\w]*/ig;
var VARIABLES = /i(\.i|\[[@#i]\])*/g;
var ACCESSOR = /(\.i|\[[@#i]\])/g;
var OPERATORS = /(===?|!==?|>=?|<=?|&&|\|\||[+\-\*\/%])/g;
//extended (english) operators
var EOPS = /(^|[^$\w])(and|or|not|is|isnot)([^$\w]|$)/g;
var LEADING_SPACE = /^\s+/;
var TRAILING_SPACE = /\s+$/;

var START_TOKEN = /\{\{\{|\{\{|\{%|\{#/;
var TAGS = {
    '{{{': /^('(\\.|[^'])*'|"(\\.|[^"'"])*"|.)+?\}\}\}/,
    '{{':  /^('(\\.|[^'])*'|"(\\.|[^"'"])*"|.)+?\}\}/,
    '{%':  /^('(\\.|[^'])*'|"(\\.|[^"'"])*"|.)+?%\}/,
    '{#':  /^('(\\.|[^'])*'|"(\\.|[^"'"])*"|.)+?#\}/
};

var delimeters = {
    '{%': 'directive',
    '{{': 'output',
    '{#': 'comment'
};

var operators = {
    and:   '&&',
    or:    '||',
    not:   '!',
    is:    '==',
    isnot: '!='
};

var constants = {
    'true':  true,
    'false': false,
    'null':  null
};

function Parser() {
    this.nest = [];
    this.compiled = [];
    this.childBlocks = 0;
    this.parentBlocks = 0;
    this.isSilent = false;
}

Parser.prototype.push = function (line) {
    if (!this.isSilent) {
        this.compiled.push(line);
    }
};

Parser.prototype.parse = function (src) {
    var _this = this;
    return _this.tokenize(src).then(function () {
        return Promise.resolve(_this.compiled);
    });
};

Parser.prototype.tokenize = function (src) {
    var _this = this;
    return new Promise(function (resolve, reject) {
        var lastEnd = 0, parser = _this, trimLeading = false;
        matchAll(src, START_TOKEN, function (open, index, src) {
            //here we match the rest of the src against a regex for this tag
            var match = src.slice(index + open.length).match(TAGS[open]);
            match = (match ? match[0] : '');
            //here we sub out strings so we don't get false matches
            var simplified = match.replace(STRINGS, '@');
            //if we don't have a close tag or there is a nested open tag
            if (!match || ~simplified.indexOf(open)) {
                return Promise.resolve(index + 1);
            }
            var inner = match.slice(0, 0 - open.length);
            //check for white-space collapse syntax
            if (inner.charAt(0) == '-') var wsCollapseLeft = true;
            if (inner.slice(-1) == '-') var wsCollapseRight = true;
            inner = inner.replace(/^-|-$/g, '').trim();
            //if we're in raw mode and we are not looking at an "endraw" tag, move along
            if (parser.rawMode && (open + inner) != '{%endraw') {
                return Promise.resolve(index + 1);
            }
            var text = src.slice(lastEnd, index);
            lastEnd = index + open.length + match.length;
            if (trimLeading) text = trimLeft(text);
            if (wsCollapseLeft) text = trimRight(text);
            if (wsCollapseRight) trimLeading = true;
            if (open == '{{{') {
                //liquid-style: make {{{x}}} => {{x|safe}}
                open = '{{';
                inner += '|safe';
            } else if (open == '{#') {
                return Promise.resolve(lastEnd)
            }

            parser.textHandler(text);
            return parser.tokenHandler(open, inner);
        }).then(function(){
            var text = src.slice(lastEnd);
            if (trimLeading) text = trimLeft(text);
            _this.textHandler(text);
            resolve();
        });
    });
};

Parser.prototype.textHandler = function (text) {
    if (text) {
        this.push('write(' + JSON.stringify(text) + ');');
    }
};

Parser.prototype.tokenHandler = function (open, inner) {
    var type = delimeters[open];
    if (type == 'directive') {
        return this.compileTag(inner);
    } else if (type == 'output') {
        var extracted = this.extractEnt(inner, STRINGS, '@');
        //replace || operators with ~
        extracted.src = extracted.src.replace(/\|\|/g, '~').split('|');
        //put back || operators
        extracted.src = extracted.src.map(function (part) {
            return part.split('~').join('||');
        });
        var parts = this.injectEnt(extracted, '@');
        if (parts.length > 1) {
            var filters = parts.slice(1).map(this.parseFilter.bind(this));
            this.push('filter(' + this.parseExpr(parts[0]) + ',' + filters.join(',') + ');');
        } else {
            this.push('filter(' + this.parseExpr(parts[0]) + ');');
        }
        return Promise.resolve();
    } else {
        return Promise.resolve();
    }
};

Parser.prototype.compileTag = function (str) {
    var directive = str.split(' ')[0];
    var handler = jinja.tag_handlers[directive];
    if (!handler) {
        throw new Error('Invalid tag: ' + str);
    }
    var r = handler.call(this, str.slice(directive.length).trim());
    if (r==undefined){
        return Promise.resolve();
    } else {
        return r;
    }
};

Parser.prototype.parseFilter = function (src) {
    src = src.trim();
    var match = src.match(/[:(]/);
    var i = match ? match.index : -1;
    if (i < 0) return JSON.stringify([src]);
    var name = src.slice(0, i);
    var args = src.charAt(i) == ':' ? src.slice(i + 1) : src.slice(i + 1, -1);
    args = this.parseExpr(args, {terms: true});
    return '[' + JSON.stringify(name) + ',' + args + ']';
};

Parser.prototype.extractEnt = function (src, regex, placeholder) {
    var subs = [], isFunc = typeof placeholder == 'function';
    src = src.replace(regex, function (str) {
        var replacement = isFunc ? placeholder(str) : placeholder;
        if (replacement) {
            subs.push(str);
            return replacement;
        }
        return str;
    });
    return {src: src, subs: subs};
};

Parser.prototype.injectEnt = function (extracted, placeholder) {
    var src = extracted.src, subs = extracted.subs, isArr = Array.isArray(src);
    var arr = (isArr) ? src : [src];
    var re = new RegExp('[' + placeholder + ']', 'g'), i = 0;
    arr.forEach(function (src, index) {
        arr[index] = src.replace(re, function () {
            return subs[i++];
        });
    });
    return isArr ? arr : arr[0];
};

//replace complex literals without mistaking subscript notation with array literals
Parser.prototype.replaceComplex = function (s) {
    var parsed = this.extractEnt(s, /i(\.i|\[[@#i]\])+/g, 'v');
    parsed.src = parsed.src.replace(NON_PRIMITIVES, '~');
    return this.injectEnt(parsed, 'v');
};

//parse expression containing literals (including objects/arrays) and variables (including dot and subscript notation)
//valid expressions: `a + 1 > b.c or c == null`, `a and b[1] != c`, `(a < b) or (c < d and e)`, 'a || [1]`
Parser.prototype.parseExpr = function (src, opts) {
    opts = opts || {};
    //extract string literals -> @
    var parsed1 = this.extractEnt(src, STRINGS, '@');
    //note: this will catch {not: 1} and a.is; could we replace temporarily and then check adjacent chars?
    parsed1.src = parsed1.src.replace(EOPS, function (s, before, op, after) {
        return (op in operators) ? before + operators[op] + after : s;
    });
    //sub out non-string literals (numbers/true/false/null) -> #
    // the distinction is necessary because @ can be object identifiers, # cannot
    var parsed2 = this.extractEnt(parsed1.src, IDENTS_AND_NUMS, function (s) {
        return (s in constants || NUMBER.test(s)) ? '#' : null;
    });
    //sub out object/variable identifiers -> i
    var parsed3 = this.extractEnt(parsed2.src, IDENTIFIERS, 'i');
    //remove white-space
    parsed3.src = parsed3.src.replace(/\s+/g, '');

    //the rest of this is simply to boil the expression down and check validity
    var simplified = parsed3.src;
    //sub out complex literals (objects/arrays) -> ~
    // the distinction is necessary because @ and # can be subscripts but ~ cannot
    while (simplified != (simplified = this.replaceComplex(simplified)));
    //now @ represents strings, # represents other primitives and ~ represents non-primitives
    //replace complex variables (those with dot/subscript accessors) -> v
    while (simplified != (simplified = simplified.replace(/i(\.i|\[[@#i]\])+/, 'v')));
    //empty subscript or complex variables in subscript, are not permitted
    simplified = simplified.replace(/[iv]\[v?\]/g, 'x');
    //sub in "i" for @ and # and ~ and v (now "i" represents all literals, variables and identifiers)
    simplified = simplified.replace(/[@#~v]/g, 'i');
    //sub out operators
    simplified = simplified.replace(OPERATORS, '%');
    //allow 'not' unary operator
    simplified = simplified.replace(/!+[i]/g, 'i');
    var terms = opts.terms ? simplified.split(',') : [simplified];
    terms.forEach(function (term) {
        //simplify logical grouping
        while (term != (term = term.replace(/\(i(%i)*\)/g, 'i')));
        if (!term.match(/^i(%i)*$/)) {
            throw new Error('Invalid expression: ' + src);
        }
    });
    parsed3.src = parsed3.src.replace(VARIABLES, this.parseVar.bind(this));
    parsed2.src = this.injectEnt(parsed3, 'i');
    parsed1.src = this.injectEnt(parsed2, '#');
    return this.injectEnt(parsed1, '@');
};

Parser.prototype.parseVar = function (src) {
    var args = Array.prototype.slice.call(arguments);
    var str = args.pop(), index = args.pop();
    //quote bare object identifiers (might be a reserved word like {while: 1})
    if (src == 'i' && str.charAt(index + 1) == ':') {
        return '"i"';
    }
    var parts = ['"i"'];
    src.replace(ACCESSOR, function (part) {
        if (part == '.i') {
            parts.push('"i"');
        } else if (part == '[i]') {
            parts.push('get("i")');
        } else {
            parts.push(part.slice(1, -1));
        }
    });
    return 'get(' + parts.join(',') + ')';
};

//escapes a name to be used as a javascript identifier
Parser.prototype.escName = function (str) {
    return str.replace(/\W/g, function (s) {
        return '$' + s.charCodeAt(0).toString(16);
    });
};

Parser.prototype.parseQuoted = function (str) {
    if (str.charAt(0) == "'") {
        str = str.slice(1, -1).replace(/\\.|"/, function (s) {
            if (s == "\\'") return "'";
            return s.charAt(0) == '\\' ? s : ('\\' + s);
        });
        str = '"' + str + '"';
    }
    try {
        return JSON.parse(str);
    } catch (e){
        console.error("could not parse string "+str+"! replacing by empty")
        return "";
    }
};

/*!
 * Helpers
 */

function trimLeft(str) {
    return str.replace(LEADING_SPACE, '');
}

function trimRight(str) {
    return str.replace(TRAILING_SPACE, '');
}

function matchAll(str, reg, fn) {
    return new Promise(function (resolve, reject) {
        //copy as global
        reg = new RegExp(reg.source, 'g' + (reg.ignoreCase ? 'i' : '') + (reg.multiline ? 'm' : ''));
        var match = reg.exec(str);

        function recurse_match() {
            if (match) {
                fn(match[0], match.index, str).then(function (result) {
                    if (typeof result == 'number') {
                        reg.lastIndex = result;
                    }
                    match = reg.exec(str);
                    recurse_match();
                });
            } else {
                resolve();
            }
        }

        recurse_match();
    });
}