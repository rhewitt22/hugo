(function() {
  'use strict';

  var options = {
    centerMode: true,
    slidesToShow: 5,
    slidesToScroll: 5,
    autoplay: true,
    swipeToSlide: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 3,
          infinite: true,
        }
      },
      {
        breakpoint: 575,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1
        }
      }
    ]
  };

  $('.carousel').slick(options);

})();