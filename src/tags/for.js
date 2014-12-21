jinja.make_tag('for', function (str) {
    var i = str.indexOf(' in ');
    var name = str.slice(0, i).trim();
    var expr = str.slice(i + 4).trim();
    this.push('each(' + this.parseExpr(expr) + ',' + JSON.stringify(name) + ',function() {');
    this.nest.unshift('for');
});
jinja.make_tag('endfor', function () {
    this.nest.shift();
    this.push('});');
});
