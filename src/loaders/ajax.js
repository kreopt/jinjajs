jinja.loader = function(path){
    return fetch(path).then(function(response){
        // status "0" to handle local files fetching (e.g. Cordova/Phonegap etc.)
        if (response.status === 200 || response.status === 0) {
            return response.text().then(function(data){
                console.log(data);
                jinja.templateFiles[name] = data;
                return jinja.templateFiles[name];
            }).catch(function(r){
                "use strict";
                console.log(":(")
            });
        } else {
            return Promise.reject(new Error(response.statusText))
        }
    })
}
