(function() {
  'use strict';
  var x = d3.scale.linear()
            .range([0, width]);

  var chart = d3.select('.viz')
                .attr('width', width);

  d3.csv('../data/species.csv', function(error, data) {
    function compare(a, b) {
      if ( a.num < b.num )
        return -1;
      if (a.num > b.num )
        return 1;
      return 0;
    }

    stats = getStats(data);
    stats.sort(compare);
    x.domain([0, d3.max(stats, function(d) { return d.num; })]);

    chart.attr('height', barHeight * stats.length);

    var bar = chart.selectAll('g')
      .data(stats)
      .enter().append('g')
        .attr('transform', function(d,i) { return 'translate(0,' + i * barHeight + ')'; });

    bar.append('rect')
      .attr('width', function(d) { return x(d.num); })
      .attr('height', barHeight - 1);

    bar.append('text')
      .attr('x', function(d) { 
        if (x(d.num) < 20) {
          return x(d.num) + 8;
        } else {
          return x(d.num) - 5;
        } 
      })
      .attr('y', barHeight / 2)
      .attr('dy', '.35em')
      .text(function(d) { return d.num; })
      .style('fill', function(d) {
        if (x(d.num) < 20) {
          return 'steelblue';
        } else {
          return '#fff';
        } 
      });
  });
})();

function getStats(species) {
  var stats = [],
      statuses = [
        'Petitioned',
        'Candidate',
        'Proposed for Listing',
        'Listed',
        'Petition Withdrawn',
        'Not Warranted 12 Month Finding',
        'Removed from Candidate List through CNOR'
      ];

  $.each(statuses, function(i, el) {
    var items = $.grep(species, function(animal, index) {
      return animal.status === el;
    });
    stats.push({'name': el, 'num': items.length});
  });

  return stats;
}