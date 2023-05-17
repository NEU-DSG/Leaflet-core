/**
 * This document example1.js contains code related to the mapping the point 
 * in for the sample json data which is available in the file path 'res/data/query.json'.
 */
//A world Map is created here using leaflet js. 
var map = L.map('map');
//tiles creation here mapbox is used as the base tile layer.     
var tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    tileSize: 512,
    zoomOffset: -1,
    scrollWheelZoom: false
}).addTo(map);

//Fetching the json data to parse, from the file path 'res/data/query.json'.
fetch('./res/data/query.json')
    .then(response => response.json())
    .then(jsonData => {
        generateMarkersOnMap(jsonData);
    });

/***
 * Generates markers on the map from the parse json data
 * 
 * @param {Object} jsonData - the parsed json data.
 */
function generateMarkersOnMap(jsonData) {
    let bindings = [];
    if (jsonData && Object.keys(jsonData).length > 0) {
        if (jsonData.hasOwnProperty("results")) {
            bindings = jsonData["results"]["bindings"];
        }
    }
    let geoJson = {
        "type": "FeatureCollection",
        "features": []
    };
    // wicket(Wkt) is a library which can parse
    // the WKTliteral (geometry data) and convert to geoJson information. 
    var wkt = new Wkt.Wkt();
    // converting bindings information to the geojson format.
    var i = 1;
    bindings.forEach(binding => {
        if (binding && Object.keys(jsonData).length > 0) {
            if (binding.hasOwnProperty("coords")) {
                let featureObj = {
                    "type": "Feature",
                    "geometry": {},
                    "properties": {}
                };
                featureObj.geometry = Object.assign({}, wkt.read(binding["coords"]["value"]).toJson());
                for (prop in binding) {
                    if (binding.hasOwnProperty(prop) && prop !== 'coords') {
                        featureObj.properties[prop] = binding.hasOwnProperty(prop) ? binding[prop]["value"] : "";
                    }
                }
                featureObj.properties["id"] = i++;
                geoJson.features.push(featureObj);
            }
        }

    })

    // var markers = L.markerClusterGroup({
    //     iconCreateFunction: function(cluster) {
    //         return L.divIcon({ html: '<b>' + cluster.getChildCount() + '</b>' });
    //     }
    // });

    // for (var i = 0; i < addressPoints.length; i++) {
    // 	var a = addressPoints[i];
    // 	var title = a[2];
    // 	var marker = L.marker(new L.LatLng(a[0], a[1]), { title: title });
    // 	marker.bindPopup(title);
    // 	markers.addLayer(marker);
    // }

    // map.addLayer(markers);

    var imageContainerMargin = 70; // Margin + padding
    var currentBox = 0;
    var scrollPosition = 0;

    // This watches for the scrollable container
    $('div#contents').scroll(function() {
        scrollPosition = $(this).scrollTop();
    });

    // creating point to the map using geoJson function from the leaflet js.
    const geoJsonObj = L.geoJSON(geoJson, {
            pointToLayer: function(geoJsonPoint, latlng) {
                var myIcon = L.icon({
                    iconUrl: './res/images/marker-icon-blue.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [0, -35],
                });
                return L.marker(latlng, {
                    icon: myIcon
                });
            },
            onEachFeature: function(feature, layer) {
                let popUpHtml = "<div class='location-point-popup'><h1 class='location-point-popup-header'>Location Information:</h1><ul class='popup-list'>";
                if (feature.hasOwnProperty("properties")) {
                    for (var property in feature.properties) {
                        if (feature.properties.hasOwnProperty(property)) {
                            popUpHtml += "<li class='popup-item'>";
                            popUpHtml += "<b>" + property + "</b>: " + feature.properties[property];
                            popUpHtml += "</li>";
                        }
                    }
                    popUpHtml += "</div>"
                }
                layer.bindPopup(popUpHtml);
                (function(layer, properties) {

                    // This creates the contents of each chapter from the GeoJSON data. Unwanted items can be removed, and new ones can be added
                    // var chapter = $('<p></p>', {
                    //     text: feature.properties['work'],
                    //     class: 'chapter-header'
                    // });

                    var image = $('<img>', {
                        src: 'https://picsum.photos/200',
                    });

                    var source = $('<a>', {
                        text: feature.properties['work'],
                        href: feature.properties['source-link'],
                        target: "_blank",
                        class: 'source'
                    });

                    var description = $('<p></p>', {
                        text: feature.properties['workLabel'],
                        class: 'description'
                    });

                    var container = $('<div></div>', {
                        id: 'container' + feature.properties['id'],
                        class: 'image-container'
                    });

                    var imgHolder = $('<div></div', {
                        class: 'img-holder'
                    });

                    imgHolder.append(image);

                    container.append(imgHolder).append(source).append(description);
                    $('#contents').append(container);

                    var i;
                    var areaTop = -100;
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
                                refreshLayer(geoJson, map, feature.geometry['coordinates'], null);
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


$("div#contents").animate({ scrollTop: 5 });