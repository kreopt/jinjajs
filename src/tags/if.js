jinja.make_tag('if', function (expr) {
    this.push('if (' + this.parseExpr(expr) + ') {');
    this.nest.unshift('if');
});

jinja.make_tag('else', function () {
    if (this.nest[0] == 'for') {
        this.push('}, function() {');
    } else {
        this.push('} else {');
    }
});

jinja.make_tag('elseif', function (expr) {
    this.push('} else if (' + this.parseExpr(expr) + ') {');
});
jinja.make_tag('elif', 'elseif');

jinja.make_tag('endif', function () {
    this.nest.shift();
    this.push('}');
});