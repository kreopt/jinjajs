jinja.make_tag('include', function (name) {
    if (name[0].startsWith("'") || name[0].startsWith("\"")) {
        name = this.parseQuoted(name);
    }
    var _this = this;
    return this.readTemplateFile(name).then(function (incSrc) {
        _this.isInclude = true;
        return _this.tokenize(incSrc).then(function(){
            _this.isInclude = false;
        });
    }).catch(function(e){
        console.error(e);
    });
});
