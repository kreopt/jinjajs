jinja.make_tag('raw', function () {
    this.rawMode = true;
});
jinja.make_tag('endraw', function () {
    this.rawMode = false;
});
