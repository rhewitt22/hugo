(function() {
  'use strict';

  var map = createMap(),
    layers,
    icons = {
      refuge: L.icon({
        iconUrl: '/img/map/blue-goose75.png',
        iconSize: [75, 40],
        popupAnchor: [7, -17]
      }),
      hatchery: L.icon({
        iconUrl: '/img/map/fish75.png',
        iconSize: [75, 66],
        popupAnchor: [7, -27]
      })
    };

  L.Icon.Default.imagePath = '../img/map';

  $.getJSON('/js/offices.js', function(geojson) {
    layers = addLayers(map, geojson);
    initAutocomplete(map, geojson);
    registerLegendEvents(layers);
  });

  // Prevent form submission from reloading the page
  $('form').submit(function(e) { e.preventDefault(); });

  function createMap() {

    var map = L.map('map', {
      center: [33.761907, -85.733524],
      zoomControl: false
    });

    new L.Control.Zoom({ position: 'bottomleft' }).addTo(map);
    return map;
  }

  function addLayers(map, offices) {

    var cluster = new L.MarkerClusterGroup({showCoverageOnHover: false});
    var markers = [
      {
        name: 'Refuges', 
        marker: createOfficeLayer(offices, 'National Wildlife Refuge', 'refuge').addTo(cluster)
      },{
        name: 'Offices',
        marker: createOfficeLayer(offices, 'Ecological Services Field Office', 'refuge').addTo(cluster)
      },{
        name: 'Hatcheries',
        marker: createOfficeLayer(offices, 'National Fish Hatchery', 'hatchery').addTo(cluster)
      },{
        name: 'Joint Ventures',
        marker: createOfficeLayer(offices, 'Joint Venture Office', 'hatchery').addTo(cluster)
      }
    ];
    var toggles = {
      'Refuges': new L.layerGroup().addTo(map),
      'Offices': new L.layerGroup().addTo(map),
      'Hatcheries': new L.layerGroup().addTo(map),
      'Joint Ventures': new L.layerGroup().addTo(map)
    };

    var basemap = L.tileLayer('http://otile{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpeg', {
      attribution: '<a href="#about" class="trigger-about">About</a>',
      subdomains: '1234'
    }).addTo(map);

    L.control.layers(null, toggles,{collapsed: false, position: 'topleft'}).addTo(map);
    setZoom(offices, cluster);
    map.addLayer(cluster);
    initModal();

    return {
      markers: markers,
      basemap: basemap,
      toggles: toggles,
      cluster: cluster
    };
  }

  function onEachOffice(feature, layer) {
    var popup = _.template(
          '<h2><a href="<%= url %>"><%= name %></a></h2>' +
          '<img src=""/>' +
          '<p><%= city %>, <%= state %><br>' +
          '<a href="">Directions</a></p>'
        ),
        html = popup(feature.properties);
    layer.bindPopup(html);
  }

  function createOfficeLayer(offices, officeType, icon) {
    
    return L.geoJson(offices, {
      filter: function(feature) {
        switch(feature.properties.type) {
          case officeType: return true;
          default: return false;
        }
      },
      onEachFeature: onEachOffice,
      pointToLayer: function(feature, latlng) {
        return L.marker(latlng, {icon: icons[icon]});
      }
    });
  }

  function zoomToOffice(map, offices, name) {

    var office = $.grep(offices.features, function(el) {
      return el.properties.name === name;
    });
    map.setView(office[0].geometry.coordinates.reverse(), 13);
  }

  function initAutocomplete(map, offices) {
    $.each(offices.features, function() {
      this.value = this.properties.name;
    });

    $('#autocomplete-search').autocomplete({
      source: offices.features,
      minLength: 3,
      position: { my : 'right top', at: 'right bottom' },
      select: function( event, ui ) {
        zoomToOffice(map, offices, ui.item.label);
      }
    });
  }

  function registerLegendEvents(layers) {
    map.on('overlayremove overlayadd', function(layer) {
      $.each(layers.markers, function(i, el) {
        if (el.name === layer.name && layer.type === 'overlayremove') {
          layers.cluster.removeLayer(el.marker);
        } else if (el.name === layer.name && layer.type === 'overlayadd') {
          layers.cluster.addLayer(el.marker);
        }
      });
    });
  }

  function initModal() {
    var $modals = $('.modal'),
        $triggerAbout = $('.trigger-about'),
        $triggerHelp = $('.trigger-help'),
        $about = $('.about'),
        $help = $('.help');

    $modals.easyModal();

    // Check if local storage says to not open the help on load
    if( localStorage.getItem('hide-help') != 'true' ) {
      $help.trigger('openModal');
    }

    // Set local storage when the checkbox changes
    $('#hide-dialog').on('change', function() {
      if ( $(this).val() ) {
        localStorage.setItem('hide-help', 'true');
      } else {
        localStorage.setItem('hide-help', 'false');
      }
      $help.trigger('closeModal');
    });
    
    $triggerHelp.click(function() {
      $help.trigger('openModal');
      $about.trigger('closeModal');
    });
    $triggerAbout.click(function() {
      $help.trigger('closeModal');
      $about.trigger('openModal');
    });
  }

  function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i=0;i<vars.length;i++) {
      var pair = vars[i].split("=");
      if(pair[0] == variable){return pair[1];}
    }
    return(false);
  }

  function setZoom(offices, cluster) {
    var bounds= {
      alabama: [[35.008027, -84.89098],[30.221131, -88.47322]],
      arkansas: [[36.499600, -89.644837],[33.004106, -94.617919]],
      florida: [[31.00088, -80.03136],[24.54470, -87.63494]],
      georgia: [[35.00065, -80.84054],[30.35783, -85.60516]],
      kentucky: [[39.147458, -81.964970],[36.497129, -89.571508]],
      louisiana: [[33.019456, -88.817016],[28.925010, -94.043146]],
      mississippi: [[34.996051, -88.097887],[30.173942, -91.655008]],
      northcarolina: [[36.588116, -75.458658],[33.844516, -84.321868]],
      puertorico: [[18.515757, -65.221567],[17.926874, -67.9407989]],
      southcarolina: [[35.2154, -78.54108], [32.0346, -83.3532]],
      tennessee: [[36.678117, -81.64690],[34.98297, -90.310297]],
      virginislands: [[18.41348, -64.56654],[17.67409, -65.08536]]
    };
    
    if (getQueryVariable('state')) {
      var state = getQueryVariable('state');
      map.fitBounds(bounds[state]);
    } else {
      map.fitBounds(cluster.getBounds());
    }
  }
})();