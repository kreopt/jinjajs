jinja.make_tag('comment', function () {
    this.commentMode = true;
});
jinja.make_tag('endcomment', function () {
    this.commentMode = false;
});
