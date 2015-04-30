(function() {
  'use strict';
  var ecos = $('.species-codes .ecos-code').text(),
      scientific = $('.species-codes .scientific-name').text(),
      source = $('#register-template').html(),
      template = Handlebars.compile(source),
      $registerItems = $('.register-list');

  var url = 'https://www.federalregister.gov/api/v1/articles.json',
  nextPageUrl = null;
  // Call the Federal Register API
  function sendRequest (url) {

    $.ajax({
      url: url,
      data: {
        per_page: 1000,
        order: 'newest',
        conditions: {
          term: scientific
        }
      },
      dataType: 'jsonp',
      success: function( response ) {
        console.log(response);
        $registerItems.append( template(response) );
        formatDates();
      }
    });
  }

  function formatDates() {
    $('.publication-date').each(function (i, el) {
      var date = $(el).text();
      var formatted = moment(date).format('MMMM D, YYYY');
      $(el).text(formatted);
    });
  }

  sendRequest(url);
})();