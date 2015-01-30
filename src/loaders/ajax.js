jinja.register_loader('ajax', function(path){
    var _this = this;
    return fetch(path).then(function(response){
        // status "0" to handle local files fetching (e.g. Cordova/Phonegap etc.)
        if (response.status === 200 || response.status === 0) {
            return response.text().then(function(data){
                _this.template_files[name] = data;
                return data;
            }).catch(function(r){
                console.log("failed to get template string")
            });
        } else {
            return Promise.reject(new Error(response.statusText))
        }
    })
});
