(function() {
  'use strict';

  var options = {
    centerMode: true,
    autoplay: true,
    swipeToSlide: true,
    infinite: true,
    slidesToShow: 3,
    slidesToScroll: 3,
    responsive: [
      {
        breakpoint: 1200,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 3
        }
      },
      {
        breakpoint: 975,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 2
        }
      },
      { 
        breakpoint: 650,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1
        }
      }
    ]
  };

  $('.carousel').slick(options);
  $('.modal').easyModal({
    overlayClose: true
  });

  $('.org-chart li').on('click', function(e) {
    var modalName = $(this).attr('data-trigger');
    $('.modal.'+ modalName).trigger('openModal');
  });
})();