jinja.make_tag('set', function (stmt) {
    var i = stmt.indexOf('=');
    var name = stmt.slice(0, i).trim();
    var expr = stmt.slice(i + 1).trim();
    this.push('set(' + JSON.stringify(name) + ',' + this.parseExpr(expr) + ');');
});

jinja.make_tag('assign', 'set');