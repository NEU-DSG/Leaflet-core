/**
 * This document example-filtering.js contains code related to the mapping the point 
 * in for the sample json data which is available in the file path 'res/data/query.json'.
 */

//A world Map is created here using leaflet js. 
var map = L.map('map', {
    zoom: 13,
    center: [42.361145, -71.057083],
    zoomControl: false
});

// Base tile creation and setup (stadia maps is being used here for tile layers).     
var tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    minZoom: 11,
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>',

}).addTo(map);

L.control.zoom({
    position: 'topright'
}).addTo(map);

// var tiles = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', {
//     maxZoom: 18,
//     minZoom: 11,
//     attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
//     id: 'mapbox/streets-v11',
//     tileSize: 512,
//     zoomOffset: -1
// }).addTo(map);

// style object with widht, opacity and fillOpacity used for creating the boundaries of leaflet map.
function style(feature) {
    return {
        weight: 2,
        opacity: 1,
        fillOpacity: 0,
    };
}

// creating boundaries to boston area using geojson.
L.geoJson(statesData, {
    style: style
}).addTo(map);

// geolet is a plugin, which will show the current location marker on the map and when clicked on 
// current location icon it will point out the clients live location.
var geolet = L.geolet({
    position: 'topright',
    enableHighAccuracy: true
}).addTo(map);


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
        bindings = reformatThebindings(response["results"]["bindings"]);
        // Finally create markers on the map.
        generateMarkersOnMap(Object.assign([], bindings));
    }
}).catch(err => {
    // Error handling in case api failure.
    console.log("Some error happened with the api", err);
});

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

/** Geo-let success event which is triggered when user click on the locate me button. */
// intial zoom level.
var zoomLevel = 23;
map.on('geolet_success', function(data) {
    // check for edge cases.
    if (data && data.first == true) {
        // set the view of the leaflet map, so that all the markers are visible, based on lat and lng.
        map.setView([data.latlng["lat"], data.latlng["lng"]], zoomLevel);
    }
})

/** Geo-let error event which is triggered when user tries to use locate me but and it throws error. */
map.on('geolet_error', function(data) {
     // check for edge cases.
    if (data && data.raw && data.raw.message) {
        // send an alert message if there is a error while fetching the location of client.
        alert(data.raw.message);
    }
});

// Cluster markers setup, which is used to show the marker in the map in clusters.
var markers = L.markerClusterGroup({
    zoomToBoundsOnClick: true
});

// wkt string literal, used for parsing the string literals that is of wkt format.
var wkt = new Wkt.Wkt();

// Intializing Icon that is used for marking the data in the leaflet map, blue marker. 
var myIcon = L.icon({
    iconUrl: './res/images/marker-icon-blue.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -35],
});

// All the bindings intial value.
var bindings = [];
var searchBindings = [];

/***
 *  Creates the html string required for the popups in the map.
 * 
 * @param {Object} binding - the binding data for a popup.
 */
function createPopUpHtmlForBinding(binding) {
    // Main div tag for the popup design.
    let popUpHtml = "<div class='location-point-popup'>";
    // Check if the bindings has DRSImageURL or image url field name.
    if (binding["DRSImageURL"] || binding["image"]) {
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
    if (binding["workLabel"]) {
        // append the work label as an heading.
        popUpHtml += binding["workLabel"] + "</h1><ul class='popup-list'></ul>";
    } else {
         // if there is no label then appending just location information text.
        popUpHtml += "Location Information</h1><ul class='popup-list'></ul>";
    }
    // check for yearInstalled field name.
    if (binding["yearInstalled"]) {
        // if year installed is available then add the yearInstalled to the popup html by formating it.
        popUpHtml += "<li class='popup-item'>";
        popUpHtml += "<strong>Year Installed: </strong> " + binding["yearInstalled"].replaceAll(" or", ',');
        popUpHtml += "</li>";
    }
     // check for yearRemoved field name.
    if (binding["yearRemoved"]) {
        // if yearremoved is available then add the yearRemoved to the popup html by formating it.
        popUpHtml += "<li class='popup-item'>";
        popUpHtml += "<strong>Year Removed: </strong> " + binding["yearRemoved"].replaceAll(" or", ',');
        popUpHtml += "</li>";
    }
     // check for creators field name.
    if (binding["creators"]) {
         //if creators are available then add the creators to the popup html by formatting it.
        popUpHtml += "<li class='popup-item'>";
        popUpHtml += "<strong>Creators:</strong> " + binding["creators"].replaceAll(";", ',');
        popUpHtml += "</li>";
    }
    // check for materials field name.
    if (binding["materials"]) {
        // if materials are available then add the materials to the popup html by formatting it.
        popUpHtml += "<li class='popup-item'>";
        popUpHtml += "<strong>Materials:</strong> " + binding["materials"].replaceAll(";", ',');
        popUpHtml += "</li>";
    }
    // check for categories field name.
    if (binding["categories"]) {
        // if categories are available then add the categories to the popup html by formatting it.
        popUpHtml += "<li class='popup-item'>";
        popUpHtml += "<strong>Categories:</strong> " + binding["categories"].replaceAll(";", ',');
        popUpHtml += "</li>";
    }
    // check for neighborhoods field name.
    if (binding["neighborhoods"]) {
        // if neighborhoods are available then add the neighborhoods to the popup html by formatting it.
        popUpHtml += "<li class='popup-item'>";
        popUpHtml += "<strong>Neighborhoods:</strong> " + binding["neighborhoods"].replaceAll(";", ',');
        popUpHtml += "</li>";
    }
    // check for depicted field name.
    if (binding["depicted"]) {
        // if depicted is available then add the depicted to the popup html by formatting it.
        popUpHtml += "<li class='popup-item'>";
        popUpHtml += "<strong>Depicted:</strong> " + binding["depicted"].replaceAll(";", ',');
        popUpHtml += "</li>";
    }
    // check for commemorated field name.
    if (binding["commemorated"]) {
        // if commemorated is available then add the commemorated to the popup html by formatting it.
        popUpHtml += "<li class='popup-item'>";
        popUpHtml += "<strong>Commemorated:</strong> " + binding["commemorated"].replaceAll(";", ',');
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
        popUpHtml += "<li class='popup-item more-info-section'>";
        popUpHtml += "<a href = '" + binding["work"] + "' class='more-info-span' target='_blank'>More information.... <img src='res/images/external-link.svg' width='10' heigth='10'></a>"
    }

    popUpHtml += '</div>';
    // return the final html that is displaid on the popup.
    return popUpHtml;
}

/**
 * Adds the binding data to the map.
 * 
 * @param {Object} binding - the binding to be added to the map.
 */
function addMarkerToTheMap(binding) {
    // Crete a new maker using leaflet library, based on the coordinates of the binding.
    var marker = L.marker(getCoordinates(binding), {
        icon: myIcon,
        markerInformation: binding
    });
    // Get the html for the popup, related to the current binding.
    let popUpHtml = createPopUpHtmlForBinding(binding);
    // binding the above html to the current marker.
    marker.bindPopup(popUpHtml);
    // Add the marker to the leaflet map as a layer.
    markers.addLayer(marker);
}

/***
 * Custom year ranges based on the date fields in binding json.
 * 
 * @param {Number} fromDate - the given date from json.
 */
function customYearRange(fromDate) {
    var yearRange = "";
    // if date range is anywhere in between 1700 to 1799 then merge into one range.
    if (fromDate >= 1700 && fromDate <= 1799) {
        yearRange = "1700-1799";
    } else if (fromDate >= 1800 && fromDate <= 1899) {
        // if date range is anywhere in between 1800 to 1899 then merge into one range.
        yearRange = "1800-1899";
    } else if (fromDate >= 1900 && fromDate <= 1929) {
        // if date range is anywhere in between 1900 to 1929 then merge into one range.
        yearRange = "1900-1929";
    } else if (fromDate >= 1930 && fromDate <= 1969) {
         // if date range is anywhere in between 1930 to 1969 then merge into one range.
        yearRange = "1930-1969";
    } else if (fromDate >= 1970) {
        // if date is greater than 1970 then divide the years formatting into 10 range.
        var starDate = fromDate - (fromDate % 10)
        yearRange = starDate + "-" + (starDate + 9);
    }
    // return the final year range.
    return yearRange;
}

/***
 * Generates markers on the map from the parse json data
 * 
 * @param {Object} jsonData - the parsed json data.
 */
function generateMarkersOnMap(jsonData) {
    // setting the default variable needed in this method.
    var categories = new Map();
    var neighborhoods = new Map();
    var yearInstalled = new Map();
    var materials = new Map();
    var minYear = Number.MAX_SAFE_INTEGER,
        maxYear = Number.MIN_SAFE_INTEGER;

    // Looping through the json/jsonData to add markers to the map and to genarate filters on the left side.
    jsonData.forEach(binding => {
        // Year Installed filters parsing and updation.
        if (binding["yearInstalled"]) {
            // if the yearInstalled field has or in it then we need to split the two years and count them indvidually.
            if (binding["yearInstalled"].includes("or")) {
                // split the or in year so that we get multiple years.
                var years = binding["yearInstalled"].split(" or ");
                // loop through all the available years to calculate the count individually.
                years.forEach(year => {
                    // min and max years are stored that can be used while filtering the data.
                    minYear = Math.min(minYear, parseInt(year));
                    maxYear = Math.max(maxYear, parseInt(year));
                    // Get the year range based on the year.
                    var yearRange = customYearRange(parseInt(year));
                    var currentYear = yearInstalled.get(yearRange);
                    // check if the current year is valid or ont.
                    if (currentYear === undefined) {
                        yearInstalled.set(yearRange, 1);
                    } else {
                        // if current year is available then add plus one to it.
                        yearInstalled.set(yearRange, currentYear + 1);
                    }
                });
            } 
            else {
                // if only one year is available in the binding the store that in yearinstalled.
                minYear = Math.min(minYear, parseInt(binding["yearInstalled"]));
                maxYear = Math.max(maxYear, parseInt(binding["yearInstalled"]));
                // Get the year range based on the year.
                var yearRange = customYearRange(parseInt(binding["yearInstalled"]));
                // check if the year is already available, otherwise add the count to 1.
                var currentYear = yearInstalled.get(yearRange);
                if (currentYear === undefined) {
                    yearInstalled.set(yearRange, 1);
                } else {
                    // if year already present increase the count by 1.
                    yearInstalled.set(yearRange, currentYear + 1);
                }
            }
        } else {
            // The case where the year installed in unavailable in the binding.
            var currentYear = yearInstalled.get("NA");
            // store the NA to the yearinstalled map.
            if (currentYear === undefined) {
                yearInstalled.set("NA", 1);
            } else {
                // increment the count.
                yearInstalled.set("NA", currentYear + 1);
            }
        }
        // Categories filters parsing and updation.
        if (binding["categories"]) {
            // check if the categories field has semicolon in it.
            if (!binding["categories"].includes(";")) {
                // if there is only single category. 
                var currentCat = categories.get(binding["categories"]);
                // update the categories count map.
                if (currentCat === undefined) {
                    categories.set(binding["categories"], 1);
                } else {
                    // increment the current category count by 1.
                    categories.set(binding["categories"], currentCat + 1);
                }
            } else {
                 // if there are multiple categories then split by semicolons to get all categories. 
                var multipleCat = binding["categories"].split("; ");
                // iterate through all the categories.
                multipleCat.forEach(cat => {
                    var currentCat = categories.get(cat);
                    if (currentCat === undefined) {
                        categories.set(cat, 1);
                    } else {
                        categories.set(cat, currentCat + 1);
                    }
                });
            }
        }
        // Neighborhoods filters parsing and updation.
        if (binding["neighborhoods"]) {
            if (!binding["neighborhoods"].includes(";")) {
                var currentNeig = neighborhoods.get(binding["neighborhoods"]);
                if (currentNeig === undefined) {
                    neighborhoods.set(binding["neighborhoods"], 1);
                } else {
                    neighborhoods.set(binding["neighborhoods"], currentNeig + 1);
                }
            } else {
                var multipleNeig = binding["neighborhoods"].split("; ");
                multipleNeig.forEach(neighbor => {
                    var currentNeig = neighborhoods.get(neighbor);
                    if (currentNeig === undefined) {
                        neighborhoods.set(neighbor, 1);
                    } else {
                        neighborhoods.set(neighbor, currentNeig + 1);
                    }
                });
            }
        }
        // Materials filters parsing and updation.
        if (binding["materials"]) {
            if (!binding["materials"].includes(";")) {
                var currentMaterial = materials.get(binding["materials"]);
                if (currentMaterial === undefined) {
                    materials.set(binding["materials"], 1);
                } else {
                    materials.set(binding["materials"], currentMaterial + 1);
                }
            } else {
                var multipleMaterials = binding["materials"].split("; ");
                multipleMaterials.forEach(material => {
                    var currentMaterial = materials.get(material);
                    if (currentMaterial === undefined) {
                        materials.set(material, 1);
                    } else {
                        materials.set(material, currentMaterial + 1);
                    }
                });
            }
        } else {
            var currentMaterial = materials.get("NA");
            if (currentMaterial === undefined || currentMaterial == "") {
                materials.set("NA", 1);
            } else {
                materials.set("NA", currentMaterial + 1);
            }
        }
        addMarkerToTheMap(binding);
    });
    map.addLayer(markers);
    categories = new Map([...categories].sort((a, b) => String(a[0]).localeCompare(b[0])));
    neighborhoods = new Map([...neighborhoods].sort((a, b) => String(a[0]).localeCompare(b[0])));
    materials = new Map([...materials].sort((a, b) => String(a[0]).localeCompare(b[0])));
    var materialsNaValue = materials.get("NA");
    materials.delete("NA");
    materials.set("NA", materialsNaValue);
    yearInstalled = new Map([...yearInstalled].sort());
    var yearInstalledWithZeroCount = new Map([...yearInstalled].sort());
    var previous = null;
    for (const [key, value] of yearInstalled) {
        if (previous != null) {
            var years = previous.split("-");
            var currentKey = (parseInt(years[1]) + 1) + "-" + (parseInt(years[1]) + 10);
            var current = yearInstalled.get(currentKey);
            if (previous != "NA" && current === undefined && (maxYear % 10) > parseInt(years[1]) + 1) {
                yearInstalledWithZeroCount.set(currentKey, 0);
            }
        }
        previous = key;
    }
    yearInstalled = new Map([...yearInstalledWithZeroCount].sort());

    // generating html for the filters year installed section (Decade wise).
    yearInstalled.forEach((count, year) => {
        var id = "d" + year;
        if (!document.getElementById(id)) {
            var htmlString = "<div class = 'list-item'> <input type = 'checkbox' id = '" +
                id + "' name='" + id + "'" + "checked>" + "<label for = '" + id + "'> " + year + " (" + count + ")" + "</label></div>";
            document.getElementById("date-facet-section").insertAdjacentHTML('beforeend', htmlString);
            document.getElementById(id).addEventListener('change', (e) => {
                updateTheCountOfFilter(yearInstalled, categories, neighborhoods, materials);
                filterTheMarkers(yearInstalled, categories, neighborhoods, materials, true);
            })
        }
    });

    // generating html for the filters category of art section.
    categories.forEach((count, currentCategory) => {
        var id = currentCategory.replace("; ", "-");
        if (!document.getElementById(id)) {
            var htmlString = "<div class = 'list-item'> <input type = 'checkbox' id = '" +
                id + "' name='" + id + "'" + "checked>" + "<label for = '" + id + "'> " + currentCategory + " (" + count + ")" +
                "</label></div>";
            document.getElementById("art-category-section").insertAdjacentHTML('beforeend', htmlString);
            document.getElementById(id).addEventListener('change', (e) => {
                updateTheCountOfFilter(yearInstalled, categories, neighborhoods, materials);
                filterTheMarkers(yearInstalled, categories, neighborhoods, materials, true);
            })
        }
    });

    // generating html for the filters neighborhood section.
    neighborhoods.forEach((count, neighborhood) => {
        var id = neighborhood.replace("; ", "-");
        if (!document.getElementById(id)) {
            var htmlString = "<div class = 'list-item'> <input type = 'checkbox' id = '" +
                id + "' name='" + id + "'" + "checked>" + "<label for = '" + id + "'> " + neighborhood + " (" + count + ")" + "</label></div>";
            document.getElementById("neighbourhood-category-section").insertAdjacentHTML('beforeend', htmlString);
            document.getElementById(id).addEventListener('change', (e) => {
                updateTheCountOfFilter(yearInstalled, categories, neighborhoods, materials);
                filterTheMarkers(yearInstalled, categories, neighborhoods, materials, true);
            })
        }
    });

    // generating html for the filters material section.
    materials.forEach((count, material) => {
        var id = material.replace("; ", "-");
        if (!document.getElementById(id)) {
            var htmlString = "<div class = 'list-item'> <input type = 'checkbox' id = '" +
                id + "' name='" + id + "'" + "checked>" + "<label for = '" + id + "'> " + material + " (" + count + ")" + "</label></div>";
            document.getElementById("material-category-section").insertAdjacentHTML('beforeend', htmlString);
            document.getElementById(id).addEventListener('change', (e) => {
                updateTheCountOfFilter(yearInstalled, categories, neighborhoods, materials);
                filterTheMarkers(yearInstalled, categories, neighborhoods, materials, true);
            })
        }
    });

    // Select all change event handler for date filter section.
    document.getElementById('date-selectall').addEventListener('change', (e) => {
        yearInstalled.forEach((count, year) => {
            var id = "d" + year;
            if (document.getElementById('date-selectall').checked) {
                document.getElementById(id).checked = true;
            } else {
                document.getElementById(id).checked = false;
            }
        });
        updateTheCountOfFilter(yearInstalled, categories, neighborhoods, materials);
        filterTheMarkers(yearInstalled, categories, neighborhoods, materials, true);
    });

    // Select all change event handler for category filter section.
    document.getElementById('category-selectall').addEventListener('change', (e) => {
        categories.forEach((count, currentCategory) => {
            var id = currentCategory.replace("; ", "-");
            if (document.getElementById('category-selectall').checked) {
                document.getElementById(id).checked = true;
            } else {
                document.getElementById(id).checked = false;
            }
        });
        updateTheCountOfFilter(yearInstalled, categories, neighborhoods, materials);
        filterTheMarkers(yearInstalled, categories, neighborhoods, materials, true);
    });

    // Select all change event handler for neighborhood filter section.
    document.getElementById('neighborhood-selectall').addEventListener('change', (e) => {
        neighborhoods.forEach((count, neighborhood) => {
            var id = neighborhood.replace("; ", "-");
            if (document.getElementById('neighborhood-selectall').checked) {
                document.getElementById(id).checked = true;
            } else {
                document.getElementById(id).checked = false;
            }
        });
        updateTheCountOfFilter(yearInstalled, categories, neighborhoods, materials);
        filterTheMarkers(yearInstalled, categories, neighborhoods, materials, true);
    });

    // Select all change event handler for material filter section.
    document.getElementById('material-selectall').addEventListener('change', (e) => {
        materials.forEach((count, material) => {
            var id = material.replace("; ", "-");
            if (document.getElementById('material-selectall').checked) {
                document.getElementById(id).checked = true;
            } else {
                document.getElementById(id).checked = false;
            }
        });
        updateTheCountOfFilter(yearInstalled, categories, neighborhoods, materials);
        filterTheMarkers(yearInstalled, categories, neighborhoods, materials, true);
    });

    // filter search click event handler.
    document.getElementById('filters-search').addEventListener('click', (e) => {
        var searchText = document.getElementById("search-box-input").value;
        var searchedBindings = [];
        // options and keys for the fuse object to search for in the json data.
        const options = {
            threshold: 0.1,
            keys: [
                "workLabel",
                "creators",
                "workDescription",
                "depicted",
                "commemorated",
                "address",
                "yearInstalled"
            ]
        };
        // clear the markers and Update the map pins with the searched text from the user.
        if (searchText && bindings && bindings.length > 0) {
            const fuse = new Fuse(bindings, options);
            var result = fuse.search(searchText);
            result.forEach(binding => {
                if (binding["item"]) {
                    searchedBindings.push(binding["item"]);
                }
            });
            searchBindings = searchedBindings;
            updateTheCountOfFilter(yearInstalled, categories, neighborhoods, materials);
            filterTheMarkers(yearInstalled, categories, neighborhoods, materials, true);
        }
    });

    document.getElementById('distance-select').addEventListener('change', (e) => {
        var value = e.target.options[e.target.selectedIndex].value;
        if (value == "0.25") {
            zoomLevel = 23;
        } else if (value == "0.50") {
            zoomLevel = 17;
        } else if (value == "0.75") {
            zoomLevel = 16;
        } else {
            zoomLevel = 15;
        }
        // geolet.deactivate();
        geolet.activate();
    });
}

/**
 * Gets the coordinated for the particular biniding.
 * 
 * @param {Object} binding - the binding data to get coordinate information.
 */
function getCoordinates(binding) {
    if (binding["coords"]) {
        wkt.read(binding["coords"]);
    }
    return [wkt.components[0].y, wkt.components[0].x];
}

/**
 * Filters the markers available on the map.
 * 
 * @param {Array} bindings - The bindings data.
 */
function filterTheMarkers(yearInstalled, categories, neighborhoods, materials, searchFlag) {
    var filterBindings = [];
    if (searchBindings.length > 0) {
        filterBindings = searchBindings;
    } else {
        filterBindings = bindings;
    }
    markers.clearLayers();
    var tickedRanges = [],
        tickedCategories = [],
        tickedNeighbourhood = [],
        tickedMaterials = [];

    categories.forEach((count, currentCategory) => {
        var id = currentCategory.replace("; ", "-");
        if (document.getElementById(id).checked) {
            tickedCategories.push(currentCategory);
        }
    });

    neighborhoods.forEach((count, neighborhood) => {
        var id = neighborhood.replace("; ", "-");
        if (document.getElementById(id).checked) {
            tickedNeighbourhood.push(neighborhood);
        }
    });

    materials.forEach((count, material) => {
        var id = material.replace("; ", "-");
        if (document.getElementById(id).checked) {
            tickedMaterials.push(material);
        }
    });

    yearInstalled.forEach((count, year) => {
        var id = "d" + year;
        if (document.getElementById(id).checked) {
            tickedRanges.push(year);
        }
    });

    // adding markers based on the user selected filters.
    filterBindings.forEach(binding => {
        var currentYear = null,
            currentCategory = null,
            currentNeighborhood = null,
            currentMaterial = null;
        if (binding["yearInstalled"]) {
            currentYear = binding["yearInstalled"];
        }
        if (binding["categories"]) {
            currentCategory = binding["categories"];
        }
        if (binding["neighborhoods"]) {
            currentNeighborhood = binding["neighborhoods"];
        }
        if (binding["materials"]) {
            currentMaterial = binding["materials"];
        }

        var yearRangeFlag = checkYearRange(tickedRanges, currentYear);
        var categoryFlag = checkCategory(tickedCategories, currentCategory);
        var neighborHoodeFlag = checkNeighbourHood(tickedNeighbourhood, currentNeighborhood);
        var materialFlag = checkMaterial(tickedMaterials, currentMaterial);

        // Checking whether filter should happen through search or not and updated the 
        // maps related to each filter facets based on searched criteria.
        if (searchFlag && yearRangeFlag && categoryFlag && neighborHoodeFlag && materialFlag) {
            if (binding["yearInstalled"]) {
                if (binding["yearInstalled"].includes("or")) {
                    var years = binding["yearInstalled"].split(" or ");
                    years.forEach(year => {
                        var yearRange = customYearRange(parseInt(year));
                        var currentYear = yearInstalled.get(yearRange);
                        var id = "d" + yearRange;
                        if (document.getElementById(id).checked) {
                            yearInstalled.set(yearRange, currentYear + 1);
                        }
                    });
                } else {
                    var yearRange = customYearRange(parseInt(binding["yearInstalled"]));
                    var currentYear = yearInstalled.get(yearRange);
                    var id = "d" + yearRange;
                    if (document.getElementById(id).checked) {
                        yearInstalled.set(yearRange, currentYear + 1);
                    }
                }
            } else {
                var currentYear = yearInstalled.get("NA");
                var id = "d" + "NA";
                if (document.getElementById(id).checked) {
                    yearInstalled.set("NA", currentYear + 1);
                }
            }
            // Categories filters parsing and updation.
            if (binding["categories"]) {
                if (!binding["categories"].includes(";")) {
                    var currentCat = categories.get(binding["categories"]);
                    var id = binding["categories"].replace("; ", "-");
                    if (document.getElementById(id).checked) {
                        categories.set(binding["categories"], currentCat + 1);
                    }
                } else {
                    var multipleCat = binding["categories"].split("; ");
                    multipleCat.forEach(cat => {
                        var currentCat = categories.get(cat);
                        var id = cat.replace("; ", "-");
                        if (document.getElementById(id).checked) {
                            categories.set(cat, currentCat + 1);
                        }
                    });
                }
            }
            // Neighborhoods filters parsing and updation.
            if (binding["neighborhoods"]) {
                if (!binding["neighborhoods"].includes(";")) {
                    var currentNeig = neighborhoods.get(binding["neighborhoods"]);
                    var id = binding["neighborhoods"].replace("; ", "-");
                    if (document.getElementById(id).checked) {
                        neighborhoods.set(binding["neighborhoods"], currentNeig + 1);
                    }
                } else {
                    var multipleNeig = binding["neighborhoods"].split("; ");
                    multipleNeig.forEach(neighbor => {
                        var currentNeig = neighborhoods.get(neighbor);
                        var id = neighbor.replace("; ", "-");
                        if (document.getElementById(id).checked) {
                            neighborhoods.set(neighbor, currentNeig + 1);
                        }
                    });
                }
            }
            // material filters parsing and updation.
            if (binding["materials"]) {
                if (!binding["materials"].includes(";")) {
                    var currentMaterial = materials.get(binding["materials"]);
                    var id = binding["materials"].replace("; ", "-");
                    if (document.getElementById(id).checked) {
                        materials.set(binding["materials"], currentMaterial + 1);
                    }
                } else {
                    var multipleMaterials = binding["materials"].split("; ");
                    multipleMaterials.forEach(material => {
                        var currentMaterial = materials.get(material);
                        var id = material.replace("; ", "-");
                        if (document.getElementById(id).checked) {
                            materials.set(material, currentMaterial + 1);
                        }
                    });
                }
            } else {
                var currentMaterial = materials.get("NA");
                var id = "NA";
                if (document.getElementById(id).checked) {
                    materials.set("NA", currentMaterial + 1);
                }
            }
        }

        if (yearRangeFlag && categoryFlag && neighborHoodeFlag && materialFlag) {
            addMarkerToTheMap(binding);
        }
    });
    if (searchFlag) {
        updateTheCountLabels(yearInstalled, categories, neighborhoods, materials);
    }
}

/***
 * Checks whether the currentYear is in the range or not.
 */
function checkYearRange(tickedRanges, currentYear) {
    if (currentYear) {
        for (let i = 0; i < tickedRanges.length; i++) {
            var yearsRange = tickedRanges[i].split("-");
            var multipleYears = currentYear.split(" or ");
            if (tickedRanges[i] != "NA") {
                if (multipleYears.length > 1) {
                    for (let j = 0; j < multipleYears.length; j++) {
                        if (parseInt(yearsRange[0]) <= parseInt(multipleYears[j]) && parseInt(yearsRange[1]) >= parseInt(multipleYears[j])) {
                            return true;
                        }
                    }
                } else {
                    if (parseInt(yearsRange[0]) <= parseInt(currentYear) && parseInt(yearsRange[1]) >= parseInt(currentYear)) {
                        return true;
                    }
                }
            }
        }
    } else {
        if (tickedRanges.includes('NA')) {
            return true;
        }
    }

    return false;
}

/***
 * Checks whether currentCategory is in the tickedCategories or not.
 */
function checkCategory(tickedCategories, currentCategory) {
    if (currentCategory) {
        var categories = currentCategory.split("; ");
        for (let i = 0; i < tickedCategories.length; i++) {
            if (categories.includes(tickedCategories[i])) {
                return true;
            }
        }
    }
    return false;
}

/***
 * Checks whether currentNeighborhood is in the tickedNeighbourhood or not.
 */
function checkNeighbourHood(tickedNeighbourhood, currentNeighborhood) {
    if (currentNeighborhood) {
        var neighborhoods = currentNeighborhood.split("; ");
        for (let i = 0; i < tickedNeighbourhood.length; i++) {
            if (neighborhoods.includes(tickedNeighbourhood[i])) {
                return true;
            }
        }
    }
    return false;
}

/***
 * Checks whether currentMaterial is in the tickedNeighbourhood or not.
 */
function checkMaterial(tickedMaterials, currentMaterial) {
    if (currentMaterial) {
        var materialsArr = currentMaterial.split("; ");
        for (let i = 0; i < tickedMaterials.length; i++) {
            if (materialsArr.includes(tickedMaterials[i])) {
                return true;
            }
        }
    } else {
        if (tickedMaterials.includes('NA')) {
            return true;
        }
    }
    return false;
}

/***
 * Updates the count values of the facets in the filter options to zero.
 */
function updateTheCountOfFilter(yearInstalled, categories, neighborhoods, materials) {
    yearInstalled.forEach((value, key, map) => map.set(key, 0));
    categories.forEach((value, key, map) => map.set(key, 0));
    neighborhoods.forEach((value, key, map) => map.set(key, 0));
    materials.forEach((value, key, map) => map.set(key, 0));
}

/***
 * Updates the label of facets in the filter options to the new count from the searched result.
 */
function updateTheCountLabels(yearInstalled, categories, neighborhoods, materials) {
    categories.forEach((count, currentCategory) => {
        var id = currentCategory.replace("; ", "-");
        var querySelect = "label[for='" + id + "']";
        document.querySelector(querySelect).innerHTML = "<label for = '" + id + "'> " + currentCategory + " (" + count + ")" + "</label>";
    });

    // generating html for the filters neighborhood section.
    neighborhoods.forEach((count, neighborhood) => {
        var id = neighborhood.replace("; ", "-");
        var querySelect = "label[for='" + id + "']";
        document.querySelector(querySelect).innerHTML = "<label for = '" + id + "'> " + neighborhood + " (" + count + ")" + "</label>";
    });

    // generating html for the filters material section.
    materials.forEach((count, material) => {
        var id = material.replace("; ", "-");
        var querySelect = "label[for='" + id + "']";
        document.querySelector(querySelect).innerHTML = "<label for = '" + id + "'> " + material + " (" + count + ")" + "</label>";
    })

    // generating html for the filters year installed section (Decade wise).
    yearInstalled.forEach((count, year) => {
        var id = "d" + year;
        var querySelect = "label[for='" + id + "']";
        document.querySelector(querySelect).innerHTML = "<label for = '" + id + "'> " + year + " (" + count + ")" + "</label>";
    });
}

// js code related to slide in window pane.
const menuItems = document.querySelectorAll(".menu-item");
const sidebar = document.querySelector(".sidebar");
const buttonClose = document.querySelector(".close-button");

menuItems.forEach((item) => {
    item.addEventListener("click", (e) => {
        const target = e.target;
        if (
            target.classList.contains("active-item") ||
            !document.querySelector(".active-sidebar")
        ) {
            document.body.classList.toggle("active-sidebar");
        }

        // show content
        // showContent(target.dataset.item);
        // add active class to menu item
        addRemoveActiveItem(target, "active-item");
    });
});

// close sidebar when click on close button
buttonClose.addEventListener("click", () => {
    closeSidebar();
});

// remove active class from menu item and content
function addRemoveActiveItem(target, className) {
    const element = document.querySelector(`.${className}`);
    target.classList.add(className);
    if (!element) return;
    element.classList.remove(className);
}

// show specific content
function showContent(dataContent) {
    const idItem = document.querySelector(`#${dataContent}`);
    addRemoveActiveItem(idItem, "active-content");
}

// --------------------------------------------------
// close when click esc
document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        closeSidebar();
    }
});

// close sidebar when click outside
document.addEventListener("click", (e) => {
    // if (!e.target.closest(".sidebar")) {
    //     closeSidebar();
    // }
});

// --------------------------------------------------
// close sidebar

function closeSidebar() {
    document.body.classList.remove("active-sidebar");
    const element = document.querySelector(".active-item");
    const activeContent = document.querySelector(".active-content");
    if (!element) return;
    element.classList.remove("active-item");
    // activeContent.classList.remove("active-content");
}