(function() {
  'use strict';
  var ecos = $('.species-codes .ecos-code').text(),
      scientific = $('.species-codes .scientific-name').text(),
      source = $('#register-template').html(),
      template = Handlebars.compile(source),
      $registerItems = $('.register-list');

  var $siteSearch = $('.site-search'),
      $sidebar = $('.side-scroll'),
      $speciesProfile = $('.species-profile'),
      $scrollNav = $('.scroll-nav'),
      $window = $(window);

  // Activate scroll navigation
  $speciesProfile.scrollNav({
    sections: 'h3',
    insertTarget: '.side-scroll',
    insertLocation: 'appendTo',
    headlineText: 'Sections'
  });
  
  $sidebar.on('click', function() {
    $('.scroll-nav').toggleClass('show');
  });
  
  $window.scroll(function(){
    var offset = $siteSearch.offset(),
        searchBottom = offset.top + $siteSearch.height();

      if ($(this).scrollTop() > searchBottom) {
        $sidebar.addClass('fixed');
      } else {
        $sidebar.removeClass('fixed');
      }
  });
  
  $window.resize(function() {
    if ($window.width() > 850) {
      $scrollNav.show();
    } else {
      $scrollNav.hide();
    }
  });
  
  // Call the Federal Register API
  function sendRequest () {
    var url = 'https://www.federalregister.gov/api/v1/articles.json';
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
        var formatted = formatDates(response);
        $registerItems.append( template(formatted) );
      }
    });
  }

  function formatDates(data) {
    var documents = data.results;
    $.each(documents, function (i, document) {
      this.publication_date = moment(this.publication_date).format('MMMM D, YYYY');
    });
    return documents;
  }

  sendRequest();
})();