jinja.make_tag('static',function(stmt){
    stmt = stmt.trim();
	var parts = stmt.split(/\s/);
	if (parts.length < 1){
		console.warn("url tag should contain 1 or more parameters. ignoring. ");
		return;
	}
	// TODO: check quotes
	var name = parts[0].substr(1,parts[0].length-2);
	var args={positional:[], keyword:{}};
	for (var i=1; i<parts.length; i++){	
		if (parts[i].indexOd('=')!=-1){
			var kw=parts[i].split('=');
			args.keyword[kw[0].trim()]=kw[1].trim();
		} else {
			args.positional.push(parts[i].trim());
		}
	}
    this.push("write(\""+Fat.resolve_url(name, args)+"\")");
});
