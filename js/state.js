(function() {
  var state = $('.state-name').text();

  // JOBS
  var source = $('#jobs-template').html(),
      template = Handlebars.compile(source),
      $jobs = $('<ul>').addClass('jobs-list'),
      $heading = $('h2:contains(Jobs)');

  // Call the USA Jobs API
  function sendRequest () {
    var baseUrl = 'https://data.usajobs.gov/api/jobs',
        parameters = {
          OrganizationID: 'IN15',// Get results for USFWS only
          NumberOfJobs: '250',
          CountrySubDivision: state.toLowerCase()
        };

    $.ajax({
      url: baseUrl,
      data: parameters
    }).success( function (data) {
      if (data.TotalJobs === "0") {
        $jobs.html('<p>Sorry, no job openings found for ' + state + '.  Check back soon!</p>');
      } else {
        $jobs.html( template(data) );
      }
      $heading.after($jobs);
    });
  }

  sendRequest();

  // DID YOU KNOW SLIDER
  $('.did-you-know').slick({
    autoplay: true,
    autoplaySpeed: 7000,
    lazyLoad: 'ondemand'
  });

  // REFUGES
  $.getJSON('../../js/offices.js', function(data) {
    var offices = data.features,
    filtered = _.filter(offices, function(obj) {
      var props = obj.properties;
      return props.state === "LA" && props.type === "National Wildlife Refuge";
    });
    var $refuges = $('<ul>').addClass('refuge-list');
    _.each(filtered, function(obj) {
      var props = obj.properties;
      $refuges.append('<li><a href="' + props.url + '">' + props.name + '</a></li>');
    });
    $('h2:contains(National Wildlife Refuges)').after($refuges);
  });
})();