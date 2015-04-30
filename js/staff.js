$(function() {
  'use strict';

  var employees = [],
      source = $('#staff-template').html(),
      template = Handlebars.compile(source),
      $staffList = $('.staff-list'),
      $search = $('input[type=search]');

  $('.employee').each(function (i, el) {
    var $el = $(el);

    employees.push({
      name: $el.find('.employee-name').text(),
      position: $el.find('.employee-position').text(),
      email: $el.find('.employee-email').text(),
      phone: $el.find('.employee-phone').text()
    });
  });

  $search.on('keyup', function () {
    var query = $(this).val().toLowerCase(),
        filtered;
    
    filtered = $.grep(employees, function (employee, i) {
      return (employee.name.toLowerCase().indexOf(query) > -1 || 
              employee.position.toLowerCase().indexOf(query) > -1 ||
              employee.email.toLowerCase().indexOf(query) > -1);
    });

    // Recompile the template with the filtered office list
    $staffList.empty().append( template(filtered) );
  });

  $('form').on('submit', function(e) {
    e.preventDefault();
  });
});