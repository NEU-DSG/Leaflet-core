jQuery(function() {

var map = L.map('map', {
  center: [0, 0],
  zoom: 5,
  scrollWheelZoom: true
});

var lightAll = new L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
}).addTo(map);

// This customizes link to view source code; add your own GitHub repository
map.attributionControl
  .setPrefix('View <a href="http://github.com/jackdougherty/leaflet-storymap" target="_blank">code on GitHub</a>, created with <a href="http://leafletjs.com" title="A JS library for interactive maps">Leaflet</a>');

fetch('./data/map.geojson')
  .then(response => response.json())
  .then(jsonData => {
      generateMarkersOnMap(jsonData);
  });
/***
*  Creates the html string required for the popups in the map.
* 
* @param {Object} binding - the binding data for a popup.
*/
function createPopUpHtmlForBinding(binding, imagFlag = true) {
  // Main div tag for the popup design.
  let popUpHtml = "<div class='location-point-popup'>";
  // Check if the bindings has DRSImageURL or image url field name.
  if ((binding["DRSImageURL"] || binding["image"]) && imagFlag) {
      // if DRSImageURL is available then this image will be shown in the popup.
      if (binding["DRSImageURL"]) {
          popUpHtml += "<div class='popup-image-section'> <img src='" + binding["DRSImageURL"] + "' width='250'></div>";
      } else {
          // if DRSImageURL is not available then image field is shown.
          popUpHtml += "<div class='popup-image-section'> <img src='" + binding["image"] + "' width='250'></div>";
      }
  }
  // header label.
  popUpHtml += "<h1 class='location-point-popup-header'>";
  if (imagFlag) {
      if (binding["workLabel"]) {
          // append the work label as an heading.
          popUpHtml += binding["workLabel"];
      } else {
          // if there is no label then appending just location information text.
          popUpHtml += "</h1>Location Information";
      }
  }
  if (imagFlag) {
      popUpHtml += "</h1><ul class='popup-list'>";
  } else {
      popUpHtml += "</h1><ul class='popup-list list-style-none'>";
  }

  // check for yearInstalled field name.
  if (binding["yearInstalled"]) {
      // if year installed is available then add the yearInstalled to the popup html by formating it.
      popUpHtml += "<li class='popup-item'>";
      popUpHtml += "<strong>Year Installed: </strong> " + binding["yearInstalled"];
      popUpHtml += "</li>";
  }
  // check for yearRemoved field name.
  if (binding["yearRemoved"]) {
      // if yearremoved is available then add the yearRemoved to the popup html by formating it.
      popUpHtml += "<li class='popup-item'>";
      popUpHtml += "<strong>Year Removed: </strong> " + binding["yearRemoved"];
      popUpHtml += "</li>";
  }
  // check for creators field name.
  if (binding["creators"]) {
      //if creators are available then add the creators to the popup html by formatting it.
      popUpHtml += "<li class='popup-item'>";
      popUpHtml += "<strong>Creators:</strong> " + binding["creators"];
      popUpHtml += "</li>";
  }
  // check for materials field name.
  if (binding["materials"]) {
      // if materials are available then add the materials to the popup html by formatting it.
      popUpHtml += "<li class='popup-item'>";
      popUpHtml += "<strong>Materials:</strong> " + binding["materials"];
      popUpHtml += "</li>";
  }
  // check for categories field name.
  if (binding["categories"]) {
      // if categories are available then add the categories to the popup html by formatting it.
      popUpHtml += "<li class='popup-item'>";
      popUpHtml += "<strong>Categories:</strong> " + binding["categories"];
      popUpHtml += "</li>";
  }
  // check for neighborhoods field name.
  if (binding["neighborhoods"]) {
      // if neighborhoods are available then add the neighborhoods to the popup html by formatting it.
      popUpHtml += "<li class='popup-item'>";
      popUpHtml += "<strong>Neighborhoods:</strong> " + binding["neighborhoods"];
      popUpHtml += "</li>";
  }
  // check for depicted field name.
  if (binding["depicted"]) {
      // if depicted is available then add the depicted to the popup html by formatting it.
      popUpHtml += "<li class='popup-item'>";
      popUpHtml += "<strong>Depicted:</strong> " + binding["depicted"];
      popUpHtml += "</li>";
  }
  // check for commemorated field name.
  if (binding["commemorated"]) {
      // if commemorated is available then add the commemorated to the popup html by formatting it.
      popUpHtml += "<li class='popup-item'>";
      popUpHtml += "<strong>Commemorated:</strong> " + binding["commemorated"];
      popUpHtml += "</li>";
  }
  // check for address field name.
  if (binding["address"]) {
      // if address is available then add the address to the popup html by formatting it.
      popUpHtml += "<li class='popup-item'>";
      popUpHtml += "<strong>Address:</strong> " + binding["address"];
      popUpHtml += "</li>";
  }
  // check for workDescription field name.
  if (binding["workDescription"]) {
      // if workDescription is available then add the workDescription to the popup html by formatting it.
      popUpHtml += "<li class='popup-item'>";
      popUpHtml += "<strong>WorkDescription:</strong> " + binding["workDescription"];
      popUpHtml += "</li>";
  }
  // check for work field name.
  if (binding["work"]) {
      // if work is available then add the work to the popup html by formatting it.
      if (imagFlag) {
          popUpHtml += "<li class='popup-item more-info-section'>";
          popUpHtml += "<a href = '" + binding["work"] + "' class='more-info-span' target='_blank'>More information.... <img src='./assets/images/brc/external-link.svg' width='10' heigth='10'></a>"
      }
  }

  popUpHtml += '</ul></div>';
  // return the final html that is displaid on the popup.
  return popUpHtml;
}

function generateMarkersOnMap(jsonData) {
  // wicket(Wkt) is a library which can parse
  // the WKTliteral (geometry data) and convert to geoJson information. 
  var wkt = new Wkt.Wkt();
  // converting bindings information to the geojson format.
  var i = 1;
  jsonData["features"].forEach(binding => {
      if (binding && Object.keys(jsonData).length > 0) {
          if (binding.hasOwnProperty("properties")) {
              binding["geometry"] = Object.assign({}, wkt.read(binding["properties"]["coords"]).toJson());
              binding["properties"]["id"] = i++;
              delete binding["properties"]["coords"];
          }
      }
  });

  var imageContainerMargin = 70; // Margin + padding
  var currentBox = 0;
  var scrollPosition = 0;

  // This watches for the scrollable container
  $('div#contents').scroll(function() {
      scrollPosition = $(this).scrollTop();
  });

  // creating point to the map using geoJson function from the leaflet js.
  const geoJsonObj = L.geoJSON(jsonData, {
          pointToLayer: function(geoJsonPoint, latlng) {
              var myIcon = L.icon({
                  iconUrl: '/assets/images/brc/marker-icon-blue.png',
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                  popupAnchor: [0, -35],
              });
              return L.marker(latlng, {
                  icon: myIcon
              });
          },
          onEachFeature: function(feature, layer) {
              // let popUpHtml = "<div class='location-point-popup'><h1 class='location-point-popup-header'>Location Information:</h1><ul class='popup-list'>";
              // if (feature.hasOwnProperty("properties")) {
              //     for (var property in feature.properties) {
              //         if (feature.properties.hasOwnProperty(property)) {
              //             popUpHtml += "<li class='popup-item'>";
              //             popUpHtml += "<b>" + property + "</b>: " + feature.properties[property];
              //             popUpHtml += "</li>";
              //         }
              //     }
              //     popUpHtml += "</div>"
              // }
              let popUpHtml = createPopUpHtmlForBinding(feature["properties"]);
              layer.bindPopup(popUpHtml);
              (function(layer, properties) {

                  // This creates the contents of each chapter from the GeoJSON data. Unwanted items can be removed, and new ones can be added
                  var chapter = $('<p></p>', {
                      text: feature.properties['workLabel'],
                      class: 'chapter-header'
                  });

                  var image = $('<img>', {
                      src: '/assets/images/brc/no-image-available.jpg',
                  });
                  if (feature.properties.hasOwnProperty("image") && feature.properties["image"]) {
                      image = $('<img>', {
                          src: feature.properties["image"],
                      });
                  } else if (feature.properties.hasOwnProperty("DRSImageURL") && feature.properties["DRSImageURL"]) {
                      image = $('<img>', {
                          src: feature.properties["DRSImageURL"],
                      });
                  }

                  var source = $('<a>', {
                      text: feature.properties['work'],
                      href: feature.properties['work'],
                      target: '_blank',
                      class: 'source'
                  });

                  var description = $('<p></p>', {
                      text: 'Description:' + (feature.properties['workDescription'] ? feature.properties['workDescription'] : 'NA'),
                      class: 'description'
                  });

                  var address = $('<p></p>', {
                      text: 'Address:' + (feature.properties['address'] ? feature.properties['address'] : 'NA'),
                      class: 'address'
                  });

                  var container = $('<div></div>', {
                      id: 'container' + feature.properties['id'],
                      class: 'image-container'
                  });

                  var imgHolder = $('<div></div', {
                      class: 'img-holder'
                  });

                  imgHolder.append(image);

                  let popUpHtml = createPopUpHtmlForBinding(feature["properties"], false);
                  container.append(chapter).append(imgHolder).append(source).append(popUpHtml).append("<div class='pbt-20'></div>");
                  $('#contents').append(container);

                  var i;
                  var areaTop = -300;
                  var areaBottom = 0;

                  // Calculating total height of blocks above active
                  for (i = 1; i < feature.properties['id']; i++) {
                      areaTop += $('div#container' + i).height() + imageContainerMargin;
                  }

                  areaBottom = areaTop + $('div#container' + feature.properties['id']).height();

                  $('div#contents').scroll(function() {
                      if ($(this).scrollTop() >= areaTop && $(this).scrollTop() < areaBottom) {
                          if (feature.properties['id'] != currentBox) {
                              currentBox = feature.properties['id'];

                              $('.image-container').removeClass("inFocus").addClass("outFocus");
                              $('div#container' + feature.properties['id']).addClass("inFocus").removeClass("outFocus");

                              // This removes all layers besides the base layer
                              // map.eachLayer(function(layer) {
                              //     if (layer != tiles) {
                              //         map.removeLayer(layer);
                              //     }
                              // });

                              // This adds another data layer
                              refreshLayer(jsonData, map, feature.geometry['coordinates'], null);
                          }
                      }
                  });

              })(layer, feature.properties);
          }

      })
      .addTo(map);

  $('#contents').append("<div class='space-at-the-bottom'><a href='#space-at-the-top'><i class='fa fa-chevron-up'></i></br><small>Top</small></a></div>");

  map.fitBounds(geoJsonObj.getBounds(), {
      padding: [20, 20]
  })
}


// This adds data as a new layer to the map
function refreshLayer(data, map, coord, zoom) {
  // var dataLayer = L.geoJson(data);
  // dataLayer.addTo(map);
  map.setView([coord[1], coord[0]], 70);
}


$("div#contents").animate({
  scrollTop: 5
});


});