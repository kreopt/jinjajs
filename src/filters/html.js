jinja.make_filter('html', function (val) {
    return toString(val)
        .split('&').join('&amp;')
        .split('<').join('&lt;')
        .split('>').join('&gt;')
        .split('"').join('&quot;');
});
