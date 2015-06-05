(function() {
    "use strict";
    var source = $("#offices-template").html(), template = Handlebars.compile(source), $officeList = $(".office-list"), offices, $search = $("input[type=search]");
    // Get offices data, compile template
    $.getJSON("../js/offices.js", function(data) {
        offices = data.features;
        $officeList.append(template(offices));
    });
    // AFter each key stroke compare the search box query against the name and city of each office
    $search.on("keyup", function() {
        var query = $(this).val().toLowerCase(), filtered;
        filtered = $.grep(offices, function(obj) {
            return obj.properties.name.toLowerCase().indexOf(query) >= 0 || obj.properties.city.toLowerCase().indexOf(query) >= 0;
        });
        // Recompile the template with the filtered office list
        $officeList.empty().append(template(filtered));
    });
})();