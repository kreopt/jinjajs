jinja.make_tag('static',function(stmt){
    stmt = stmt.trim();
    this.push("write(\""+Fat.config.static_url + stmt.substr(1,stmt.length-2)+"\")");
});
