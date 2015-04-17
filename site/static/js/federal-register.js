(function() {
    "use strict";
    var source = $("#register-template").html(), template = Handlebars.compile(source), $registerItems = $(".register-list"), url = "https://www.federalregister.gov/api/v1/articles.json?per_page=20&order=newest&conditions%5Bagencies%5D%5B%5D=fish-and-wildlife-service&conditions%5Bdocket_id%5D=fws-r4", nextPageUrl = null, $loadMore = $("#load-more-fr-docs"), $loading = $(".spinner");
    // Call the Federal Register API
    function sendRequest(url) {
        $.ajax({
            url: url,
            dataType: "jsonp",
            success: function(response) {
                nextPageUrl = response.next_page_url;
                // jshint ignore:line
                $loading.remove();
                $loadMore.css("display", "block");
                $registerItems.append(template(response));
            }
        });
    }
    $loadMore.on("click", function() {
        if (nextPageUrl) {
            sendRequest(nextPageUrl);
        }
    });
    sendRequest(url);
})();