jQuery(function() {

var map = L.map('map', {
    center: [0, 0],
    zoom: 5,
    scrollWheelZoom: true
});

var tileLayer = new L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
}).addTo(map);

// This customizes link to view source code; add your own GitHub repository
map.attributionControl
    .setPrefix('View <a href="http://github.com/jackdougherty/leaflet-storymap" target="_blank">code on GitHub</a>, created with <a href="http://leafletjs.com" title="A JS library for interactive maps">Leaflet</a>');



// Sparql Query used to get the data from the wikidata site, inorder to fetch the data dynamically
// this query can be used to get the most updated data, this query is based on the json fields. 
const sparqlQuery = `select distinct ?work ?workDescription ?workLabel ?coords ?address
(group_concat(distinct ?workAlias; separator="; ") as ?aliases)
(sample(?image) AS ?image) 
(sample(?DRSImageURL) AS ?DRSImageURL)
(group_concat(distinct (year(?dateInstalled)); separator=" or ") as ?yearInstalled)
(group_concat(distinct (year(?dateRemoved)); separator=" or ") as ?yearRemoved)
(group_concat(distinct ?materialLabel; separator="; ") as ?materials)
(group_concat(distinct ?categoryLabel; separator="; ") as ?categories)
(group_concat(distinct ?creatorLabel; separator="; ") as ?creators)
(group_concat(distinct ?neighborhoodLabel; separator="; ") as ?neighborhoods)
(group_concat(distinct ?depictsLabel; separator="; ") as ?depicted)
(group_concat(distinct ?commemoratesLabel; separator="; ") as ?commemorated)
where {
    hint:Query hint:optimizer "None".
    # Items tagged as being on the focus list of the Neighborhood Public Art in Boston WikiProject
    # and with genre public art. Only grab items that have statements for coordinate location, instance of, 
    # located in administrative territorial entity properties
    ?work wdt:P5008 wd:Q108040915;
        wdt:P136 wd:Q557141;
        wdt:P625 ?coords;
        wdt:P31 ?category;
        wdt:P131 ?neighborhood.
    optional{?work wdt:P571 ?dateInstalled.}
    optional{?work wdt:P576 ?dateRemoved.}
    optional{?work wdt:P18 ?image.}
    optional{?work wdt:P170 ?creator.}
    optional{?work wdt:P6375 ?address.}
    optional{?work wdt:P186 ?material.}
    optional{?work wdt:P180 ?depicts.}
    optional{?work wdt:P547 ?commemorates.}
    optional{?work wdt:P6500 ?DRSImageURL.
            FILTER(regex(str(?DRSImageURL), '^https://repository.library.northeastern.edu/'))}
    service wikibase:label {bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". 
                            ?work rdfs:label ?workLabel.
                            ?work schema:description ?workDescription.
                            ?work skos:altLabel ?workAlias.
                            ?category rdfs:label ?categoryLabel.
                            ?creator rdfs:label ?creatorLabel.
                            ?material rdfs:label ?materialLabel.
                            ?neighborhood rdfs:label ?neighborhoodLabel.
                            ?depicts rdfs:label ?depictsLabel.
                            ?commemorates rdfs:label ?commemoratesLabel.
                            }
    } group by ?work ?workDescription ?workLabel ?coords ?address`

// axios.get('https://query.wikidata.org/sparql', {
//     params: {
//       query: sparqlQuery
//     },
//     headers: {"content-type": "application/sparql-results+json;charset=utf-8"}
//   }).then(response => {
//         if(response && response.status == 200) {
//             if(response.data && response["data"]["results"] && response["data"]["results"]["bindings"]) {
//                 bindings = reformatThebindings(response["data"]["results"]["bindings"]);
//                 console.log(bindings)
//                 generateMarkersOnMap(Object.assign([],bindings));
//             }
//         }
//   });

// Fetch api request for getting the bindings from the wikidata website.
url = new URL("https://query.wikidata.org/sparql?format=json&")
// Addition paramaters like 'query' to apppend the Sparql Query.
const params = new URLSearchParams();
params.append('query', sparqlQuery);
// Apending the query param to the main url.
url += params.toString()
// This function is an helper method that is used to call the api of the wikidata.
async function fetchBindingsJSON(url) {
    // waiting until we receive the response
    const response = await fetch(url);
    // converting the format of response to json
    const bindingsJson = await response.json();
    // retur the json format of binding.
    return bindingsJson;
}

// Handle the promise for the wikidata api resquest.
fetchBindingsJSON(url).then(response => {
    // check weather the response has valid bindings field.
    if (response && response["results"] && response["results"]["bindings"]) {
        // Take the bindings as a parameter and format the bindings.
        var bindings = reformatThebindings(response["results"]["bindings"]);
        // convert the bindings to geojson object.
        var geoJsonData = convertJsontoGeojson(bindings);
        // Finally create markers on the map.
        generateMarkersOnMap(geoJsonData);
    }
}).catch(err => {
    // Error handling in case api failure.
    console.log("Some error happened with the api", err);
});

/***
 * Convert the bindings from json to geojson.
 */
function convertJsontoGeojson(bindings) {
    var geojson = {
        type: "FeatureCollection",
        features: [],
        };
    for (i = 0; i < bindings.length; i++) {
        var featureObj =  {
            "type": "Feature",
            "properties": bindings[i],
            "geometry": null
        }
        geojson.features.push(featureObj);
    }
    // iterating through all the bindings.
    return geojson;

}

/***
 * Reformats the bindings to the simplified json structure.
 */
function reformatThebindings(newBindings) {
    var finalBindings = [];
    // iterating through all the bindings.
    for (const binding of newBindings) {
        var bindingObj = {};
        // The bindings has internal fields like yearinstalled, coordinates etc.
        for (const [key, objValue] of Object.entries(binding)) {
            if (objValue["value"] || objValue["value"] === "") {
                // store the required fields.
                bindingObj[key] = objValue["value"];
            }
        }
        // Add the binding object to the final bindings, used to map the markers on leaflet map.
        finalBindings.push(bindingObj)
    }
    // return the final findings.
    return finalBindings;
}


// fetch('./data/leaflet/brc/map.geojson')
//     .then(response => response.json())
//     .then(jsonData => {
//         generateMarkersOnMap(jsonData);
//     });
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
    bindingKeysObject = {
        "yearInstalled": "Year Installed:",
        "yearRemoved": "Year Removed:",
        "creators": "Creators:",
        "materials": "Materials:",
        "categories": "Categories:",
        "neighborhoods": "Neighborhoods:",
        "depicted": "Depicted:",
        "commemorated": "Commemorated:",
        "address": "Address:",
        "workDescription": "Work Description:"
    }
    for (const key in bindingKeysObject) {
        if (binding[key]) {
            popUpHtml += "<li class='popup-item'>";
            popUpHtml += "<strong>" + bindingKeysObject[key] + " </strong> " + binding[key];
            popUpHtml += "</li>";
        }
    }
    // check for work field name.
    if (binding["work"]) {
        // if work is available then add the work to the popup html by formatting it.
        if (imagFlag) {
            popUpHtml += "<li class='popup-item more-info-section'>";
            popUpHtml += "<a href = '" + binding["work"] + "' class='more-info-span' target='_blank'>More information.... <img src='./assets/images/leaflet/brc/external-link.svg' width='10' heigth='10'></a>"
        }
    }

    popUpHtml += '</ul></div>';
    // return the final html that is displaid on the popup.
    return popUpHtml;
}

function createStoryMaps(layer, feature, jsonData) {
    var imageContainerMargin = 70; // Margin + padding
    var currentBox = 0;
    // This creates the contents of each chapter from the GeoJSON data. Unwanted items can be removed, and new ones can be added
    var chapter = $('<p></p>', {
        text: feature.properties['workLabel'],
        class: 'chapter-header'
    });

    var image = $('<img>', {
        src: '/assets/images/leaflet/brc/no-image-available.jpg',
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
    var container = $('<div></div>', {
        id: 'container' + feature.properties['id'],
        class: 'image-container'
    });
    var imgHolder = $('<div></div>', {
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
                // This adds another data layer
                refreshLayer(jsonData, map, feature.geometry['coordinates'], null);
            }
        }
    });
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
    var scrollPosition = 0;
    // This watches for the scrollable container
    $('div#contents').scroll(function() {
        scrollPosition = $(this).scrollTop();
    });

    // creating point to the map using geoJson function from the leaflet js.
    const geoJsonObj = L.geoJSON(jsonData, {
            pointToLayer: function(geoJsonPoint, latlng) {
                var myIcon = L.icon({
                    iconUrl: '/assets/images/leaflet/brc/marker-icon-blue.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [0, -35],
                });
                return L.marker(latlng, {
                    icon: myIcon
                });
            },
            onEachFeature: function(feature, layer) {
                let popUpHtml = createPopUpHtmlForBinding(feature["properties"]);
                layer.bindPopup(popUpHtml);
                createStoryMaps(layer, feature, jsonData);
            }
        })
        .addTo(map);
    $('#contents').append("<div class='space-at-the-bottom'><a href='#space-at-the-top'><i class='fa fa-chevron-up'></i></br><small>Top</small></a></div>");
    map.fitBounds(geoJsonObj.getBounds(), {
        padding: [20, 20]
    });
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