jinja.make_tag('block', function (name) {
    if (this.isParent) {
        ++this.parentBlocks;
        var blockName = 'block_' + (this.escName(name) || this.parentBlocks);
        this.push('block(typeof ' + blockName + ' == "function" ? ' + blockName + ' : function() {');
    } else if (this.hasParent) {
        this.isSilent = false;
        ++this.childBlocks;
        blockName = 'block_' + (this.escName(name) || this.childBlocks);
        this.push('function ' + blockName + '() {');
    }
    this.nest.unshift('block');
});

jinja.make_tag('endblock', function () {
    this.nest.shift();
    if (this.isParent) {
        this.push('});');
    } else if (this.hasParent) {
        this.push('}');
        this.isSilent = true;
    }
});

jinja.make_tag('extends', function (name) {
    if (name[0].startsWith("'") || name[0].startsWith("\"")) {
        name = this.parseQuoted(name);
    }
    var _this = this;
    return this.read_template_file(name).then(function (parentSrc) {
        _this.isParent = true;
        return _this.tokenize(parentSrc).then(function(){
            _this.isParent = false;
            _this.hasParent = true;
            //silence output until we enter a child block
            _this.isSilent = true;
        });
    }).catch(function(e){
        console.error(e);
    });
});
