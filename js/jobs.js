(function () {
  'use strict';

  var source = $('#jobs-template').html(),
      template = Handlebars.compile(source),
      $jobs = $('.job-list'),
      $loading = $('.spinner');

  // Call the USA Jobs API
  function sendRequest () {
    var baseUrl = 'https://data.usajobs.gov/api/jobs',
        parameters = {
          OrganizationID: 'IN15',// Get results for USFWS only
          NumberOfJobs: '250',
          // Get results from R4 States/Provinces only
          CountrySubDivision: 'Alabama;Arkansas;Florida;Georgia;Kentucky;Mississippi;North Carolina;Puerto Rico;South Carolina;Tennessee;Virgin Islands'
        };

    $.ajax({
      url: baseUrl,
      data: parameters
    }).success( function (data) {
      $loading.remove();
      if (data.TotalJobs === "0") {
        $jobs.html('<p>Sorry, no results found.  Check back soon!</p>');
      } else {
        $jobs.html( template(data) );
      }
    });
  }

  sendRequest();
})();