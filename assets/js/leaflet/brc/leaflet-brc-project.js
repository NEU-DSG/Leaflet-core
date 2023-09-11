jQuery(function() {
/**
 * This document leaflet-brc-project.js contains code related to the mapping the point 
 * in for the sample json data which is available in the file path 'res/data/query.json'.
 */

//A world Map is created here using leaflet js. 
// Base tile creation and setup (stadia maps is being used here for tile layers).     
var cartoDBTile = L.tileLayer(configMaps.titleLayerMap, {
    maxZoom: configMaps.tileMaxZoom,
    minZoom: configMaps.tileMinZoom,
    attribution: configMaps.titleLayerAttribution,
});

var openStreetTile = L.tileLayer(configMaps.titleLayerOpenStreetMap, {
    maxZoom: configMaps.tileMaxZoom,
    minZoom: configMaps.tileMinZoom,
    attribution: configMaps.titleLayerOpenStreetAttribution,

});

var map = L.map('map', {
    zoom: configMaps.zoom,
    zoomSnap: 0.25,
    center: configMaps.center,
    zoomControl: configMaps.zoomControl,
    layers: [cartoDBTile,openStreetTile] 
});

var baseMaps = {
    "CartoDBMap": cartoDBTile,
    "OpenStreetMap": openStreetTile
};


var layerControl = L.control.layers(baseMaps).addTo(map);

L.control.zoom({
    position: configMaps.zoomPosition
}).addTo(map);

// creating boundaries to boston area using geojson.
const geoJsonLayer = L.geoJson(statesData, {
    style: {
        weight: configMaps.geoJsonWeight,
        opacity: configMaps.geoJsonOpacity,
        fillOpacity: configMaps.geoJsonFillOpacity,
    }
}).addTo(map);

// geolet is a plugin, which will show the current location marker on the map and when clicked on 
// current location icon it will point out the clients live location.
var geolet = L.geolet({
    position: configMaps.geoLetPosition,
    enableHighAccuracy: configMaps.enableHighAccuracy
}).addTo(map);

// Handle the promise for the wikidata api resquest.
invokeGetBindingsApi().then(response => {
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


/** Geo-let success event which is triggered when user click on the locate me button. */
// intial zoom level.
map.on('geolet_success', function(data) {
    // check for edge cases.
    if (data && data.first == true) {
        // set the view of the leaflet map, so that all the markers are visible, based on lat and lng.
        map.setView([data.latlng["lat"], data.latlng["lng"]], configMaps.zoomLevel);
    }
});

/** Geo-let error event which is triggered when user tries to use locate me but and it throws error. */
map.on('geolet_error', function(data) {
     // check for edge cases.
    if (data && data.raw && data.raw.message) {
        // send an alert message if there is a error while fetching the location of client.
        alert(data.raw.message);
    }
});

// Cluster markers setup, which is used to show the marker in the map in clusters.
var clusterMarkersGroup = L.markerClusterGroup({
    // zoomToBoundsOnClick: true
});

function distanceInMiles(lat1, lon1, lat2, lon2) {
    var R = 3958.8; // Earth's radius in miles
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var distance = R * c;
    return distance;
}

function redirectToStoryMap(lat, lng) {
    const filteredData = []
    clusterMarkersGroup.eachLayer(function(layer) {
        var markerLatLng = layer.getLatLng();
        var distance = distanceInMiles(lat, lng, markerLatLng.lat, markerLatLng.lng);
        if (distance <= 0.25) {
          filteredData.push(layer["options"]["markerInformation"]["work"]);
        }
      });
      filterDataAndMoveToStoryMap(filteredData);
}

map.on('contextmenu',function(e){
    const location = e.latlng
    var paragraphElement = document.createElement("p");
    paragraphElement.textContent = "Navigate to Story Map (0.25 miles radius) ";
    var anchorTag = document.createElement('a');
    anchorTag.href = '#';
    anchorTag.textContent = 'here';
    anchorTag.onclick = function() {
        redirectToStoryMap(location.lat, location.lng);
    };
    paragraphElement.appendChild(anchorTag);
    var popup = L.popup()
    .setLatLng(location)
    .setContent(paragraphElement)
    .openOn(map);
});


function filterDataAndMoveToStoryMap(filteredData) {
    const properties = {"filteredData" : filteredData}
    localStorage.setItem('properties', JSON.stringify(properties));
    window.location.href="./brc-leaflet-storymap.html"; 
}

clusterMarkersGroup.on('clustercontextmenu', function (a) {
	// a.layer is actually a cluster
    const location = a.latlng
    var paragraphElement = document.createElement("p");
    paragraphElement.textContent = "Navigate to Story Map with selected bindings ";
    var anchorTag = document.createElement('a');
    anchorTag.href = '#';
    anchorTag.textContent = 'here';
    anchorTag.onclick = function() {
        const childrens = a.layer.getAllChildMarkers()
        const filteredData = []
        for (const element of childrens) {
            filteredData.push(element["options"]["markerInformation"]["work"]);
        }
        filterDataAndMoveToStoryMap(filteredData);
    };
    paragraphElement.appendChild(anchorTag);
    var popup = L.popup()
    .setLatLng(location)
    .setContent(paragraphElement)
    .openOn(map);
});


// wkt string literal, used for parsing the string literals that is of wkt format.
var wkt = new Wkt.Wkt();

// Intializing Icon that is used for marking the data in the leaflet map, blue marker. 
var myIcon = L.icon({
    iconUrl: configMaps.iconUrl,
    iconSize: configMaps.iconSize,
    iconAnchor: configMaps.iconAnchor,
    popupAnchor: configMaps.popupAnchor,
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
    for (const [key, value] of Object.entries(configMaps.bindingKeysObject)) {
        if (binding[key]) {
            if (key == "address" || key == "workDescription") {
                popUpHtml += "<li class='popup-item'>";
                popUpHtml += "<strong>" + value + " </strong> " + binding[key];
                popUpHtml += "</li>";
            } else {
                popUpHtml += "<li class='popup-item'>";
                popUpHtml += "<strong>" + value + " </strong> " + binding[key].replaceAll(";", ',');
                popUpHtml += "</li>";
            }
        }
    }
    // check for work field name.
    if (binding["work"]) {
        // if work is available then add the work to the popup html by formatting it.
        popUpHtml += "<li class='popup-item more-info-section'>";
        popUpHtml += "<a href = '" + binding["work"] + "' class='more-info-span' target='_blank'>More information.... <img src='./assets/images/leaflet/brc/external-link.svg' width='10' heigth='10'></a>"
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

    marker.on('contextmenu', function(event) {
        const location = event.latlng
        var paragraphElement = document.createElement("p");
        paragraphElement.textContent = "Navigate to Story Map with selected bindings ";
        var anchorTag = document.createElement('a');
        anchorTag.href = '#';
        anchorTag.textContent = 'here';
        anchorTag.onclick = function() {
            filterDataAndMoveToStoryMap([event.target.options.markerInformation["work"]]);
        };
        paragraphElement.appendChild(anchorTag);
        var popup = L.popup()
        .setLatLng(location)
        .setContent(paragraphElement)
        .openOn(map);
    });
    // Add the marker to the leaflet map as a layer.
    clusterMarkersGroup.addLayer(marker);
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
             // check if the neighborhoods field has semicolon in it.
            if (!binding["neighborhoods"].includes(";")) {
                var currentNeig = neighborhoods.get(binding["neighborhoods"]);
                // update the neighborhoods count map.
                if (currentNeig === undefined) {
                    neighborhoods.set(binding["neighborhoods"], 1);
                } else {
                    // increment the current neighborhoods count by 1.
                    neighborhoods.set(binding["neighborhoods"], currentNeig + 1);
                }
            } else {
                var multipleNeig = binding["neighborhoods"].split("; ");
                multipleNeig.forEach(neighbor => {
                    var currentNeig = neighborhoods.get(neighbor);
                    // update the neighborhoods count map.
                    if (currentNeig === undefined) {
                        neighborhoods.set(neighbor, 1);
                    } else {
                        // increment the current neighborhoods count by 1.
                        neighborhoods.set(neighbor, currentNeig + 1);
                    }
                });
            }
        }
        // Materials filters parsing and updation.
        if (binding["materials"]) {
            if (!binding["materials"].includes(";")) {
                var currentMaterial = materials.get(binding["materials"]);
                // update the materials count map.
                if (currentMaterial === undefined) {
                    materials.set(binding["materials"], 1);
                } else {
                    // increment the current materials count by 1.
                    materials.set(binding["materials"], currentMaterial + 1);
                }
            } else {
                var multipleMaterials = binding["materials"].split("; ");
                multipleMaterials.forEach(material => {
                    var currentMaterial = materials.get(material);
                    // update the materials count map.
                    if (currentMaterial === undefined) {
                        materials.set(material, 1);
                    } else {
                        // increment the current materials count by 1.
                        materials.set(material, currentMaterial + 1);
                    }
                });
            }
        } else {
            // case where the material is unknown.
            var currentMaterial = materials.get("NA");
            if (currentMaterial === undefined || currentMaterial == "") {
                materials.set("NA", 1);
            } else {
                materials.set("NA", currentMaterial + 1);
            }
        }
        // Add the marker to the map.
        addMarkerToTheMap(binding);
    });

    // add the markers
    map.addLayer(clusterMarkersGroup);
    // sort categories
    categories = new Map([...categories].sort((a, b) => String(a[0]).localeCompare(b[0])));
    // sort neighborhoods
    neighborhoods = new Map([...neighborhoods].sort((a, b) => String(a[0]).localeCompare(b[0])));
    // sort materials
    materials = new Map([...materials].sort((a, b) => String(a[0]).localeCompare(b[0])));
    var materialsNaValue = materials.get("NA");
    materials.delete("NA");
    materials.set("NA", materialsNaValue);
    // sort yearInstalled
    yearInstalled = new Map([...yearInstalled].sort());
    var yearInstalledWithZeroCount = new Map([...yearInstalled].sort());
    var previous = null;
    // iterate through year installed map details and set the range based on the requirements.
    for (const [key, value] of yearInstalled) {
        if (previous != null) {
            // split the year by hyphen
            var years = previous.split("-");
            // current key.
            var currentKey = (parseInt(years[1]) + 1) + "-" + (parseInt(years[1]) + 10);
            var current = yearInstalled.get(currentKey);
            // add zero count years range to the map.
            if (previous != "NA" && current === undefined && (maxYear % 10) > parseInt(years[1]) + 1) {
                yearInstalledWithZeroCount.set(currentKey, 0);
            }
        }
        // store previous key 
        previous = key;
    }
    // sort zero count years.
    yearInstalled = new Map([...yearInstalledWithZeroCount].sort());

    // generating html for the filters year installed section (Decade wise).
    yearInstalled.forEach((count, year) => {
        var id = "d" + year;
        if (!document.getElementById(id)) {
            // html string used to show the items in the year installed section.
            var htmlString = "<li><div><input class='form-check-input' type='checkbox' id ='" +
                id + "' name='" + id + "'" + "checked>" + "<label class='form-check-label pl-4' for = '" + id + "'> " + year + " (" + count + ")" + "</label></div></li>";
            // insert the html string to the div section.
            document.getElementById("date-facet-section").insertAdjacentHTML('beforeend', htmlString);
            // adding the change event listener to the checkboxes.
            document.getElementById(id).addEventListener('change', (e) => {
                // when there is a change update the filters data.
                updateTheCountOfFilter(yearInstalled, categories, neighborhoods, materials);
                filterTheMarkers(yearInstalled, categories, neighborhoods, materials, true);
            })
        }
    });

    // generating html for the filters category of art section.
    categories.forEach((count, currentCategory) => {
        var id = currentCategory.replace("; ", "-");
        if (!document.getElementById(id)) {
            // html string used to show the items in the categories section.
            var htmlString = "<li><div><input class='form-check-input' type='checkbox' id ='" +
                id + "' name='" + id + "'" + "checked>" + "<label class='form-check-label pl-4' for = '" + id + "'> " + currentCategory + " (" + count + ")" +
                "</label></div></li>";
            // insert the html string to the div section. 
            document.getElementById("art-category-section").insertAdjacentHTML('beforeend', htmlString);
            // adding the change event listener to the checkboxes.
            document.getElementById(id).addEventListener('change', (e) => {
                // when there is a change update the filters data.
                updateTheCountOfFilter(yearInstalled, categories, neighborhoods, materials);
                filterTheMarkers(yearInstalled, categories, neighborhoods, materials, true);
            })
        }
    });

    // generating html for the filters neighborhood section.
    neighborhoods.forEach((count, neighborhood) => {
        var id = neighborhood.replace("; ", "-");
        if (!document.getElementById(id)) {
            // html string used to show the items in the neighborhoods section.
            var htmlString = "<li><div><input class='form-check-input' type='checkbox' id ='" +
                id + "' name='" + id + "'" + "checked>" + "<label class='form-check-label pl-4' for = '" + id + "'> " + neighborhood + " (" + count + ")" + "</label></div></li>";
            // insert the html string to the div section.
            document.getElementById("neighbourhood-category-section").insertAdjacentHTML('beforeend', htmlString);
           // adding the change event listener to the checkboxes.
            document.getElementById(id).addEventListener('change', (e) => {
                // when there is a change update the filters data.
                updateTheCountOfFilter(yearInstalled, categories, neighborhoods, materials);
                filterTheMarkers(yearInstalled, categories, neighborhoods, materials, true);
            })
        }
    });

    // generating html for the filters material section.
    materials.forEach((count, material) => {
        var id = material.replace("; ", "-");
        if (!document.getElementById(id)) {
            // html string used to show the items in the materials section.
            var htmlString = "<li><div><input class='form-check-input' type='checkbox' id ='" +
                id + "' name='" + id + "'" + "checked>" + "<label class='form-check-label pl-4' for = '" + id + "'> " + material + " (" + count + ")" + "</label></div></li>";
            // insert the html string to the div section.
            document.getElementById("material-category-section").insertAdjacentHTML('beforeend', htmlString);
            // adding the change event listener to the checkboxes.
            document.getElementById(id).addEventListener('change', (e) => {
                // when there is a change update the filters data.
                updateTheCountOfFilter(yearInstalled, categories, neighborhoods, materials);
                filterTheMarkers(yearInstalled, categories, neighborhoods, materials, true);
            })
        }
    });

    // Select all change event handler for date filter section.
    document.getElementById('date-selectall').addEventListener('change', (e) => {
        // iterate each year range and uncheck all the checkboxes.
        yearInstalled.forEach((count, year) => {
             // format date.
            var id = "d" + year;
            // check if select all checkbox is checked or not.
            if (document.getElementById('date-selectall').checked) {
                document.getElementById(id).checked = true;
            } else {
                document.getElementById(id).checked = false;
            }
        });
        // update the count and filters data.
        updateTheCountOfFilter(yearInstalled, categories, neighborhoods, materials);
        filterTheMarkers(yearInstalled, categories, neighborhoods, materials, true);
    });

    // Select all change event handler for category filter section.
    document.getElementById('category-selectall').addEventListener('change', (e) => {
        // iterate each category and uncheck all the checkboxes.
        categories.forEach((count, currentCategory) => {
            // format category
            var id = currentCategory.replace("; ", "-");
            // check if select all checkbox is checked or not.
            if (document.getElementById('category-selectall').checked) {
                document.getElementById(id).checked = true;
            } else {
                document.getElementById(id).checked = false;
            }
        });
         // update the count and filters data.
        updateTheCountOfFilter(yearInstalled, categories, neighborhoods, materials);
        filterTheMarkers(yearInstalled, categories, neighborhoods, materials, true);
    });

    // Select all change event handler for neighborhood filter section.
    document.getElementById('neighborhood-selectall').addEventListener('change', (e) => {
        // iterate each neighbor and uncheck all the checkboxes.
        neighborhoods.forEach((count, neighborhood) => {
             // format neighborhood.
            var id = neighborhood.replace("; ", "-");
            // check if select all checkbox is checked or not.
            if (document.getElementById('neighborhood-selectall').checked) {
                document.getElementById(id).checked = true;
            } else {
                document.getElementById(id).checked = false;
            }
        });
         // update the count and filters data.
        updateTheCountOfFilter(yearInstalled, categories, neighborhoods, materials);
        filterTheMarkers(yearInstalled, categories, neighborhoods, materials, true);
    });

    // Select all change event handler for material filter section.
    document.getElementById('material-selectall').addEventListener('change', (e) => {
        // iterate each material and uncheck all the checkboxes.
        materials.forEach((count, material) => {
             // format material
            var id = material.replace("; ", "-");
             // check if select all checkbox is checked or not.
            if (document.getElementById('material-selectall').checked) {
                document.getElementById(id).checked = true;
            } else {
                document.getElementById(id).checked = false;
            }
        });
         // update the count and filters data.
        updateTheCountOfFilter(yearInstalled, categories, neighborhoods, materials);
        filterTheMarkers(yearInstalled, categories, neighborhoods, materials, true);
    });

    function searchForBindings() {
         // get searched value.
         var searchText = document.getElementById("search-box-input").value;
         var searchedBindings = [];
         // options and keys for the fuse object to search for in the json data.
         const options = {
             threshold: configMaps.fuseThreshold,
             keys: configMaps.fuseKeys
         };
         // clear the markers and Update the map pins with the searched text from the user.
         if (searchText && bindings && bindings.length > 0) {
             // fuse is used to search with different options based on the JSON fields.
             const fuse = new Fuse(bindings, options);
             // seach api to set the cofiguration.
             var result = fuse.search(searchText);
             // iterate throgh the searched results and get the bindings.
             if(result.length == 0) {
                 $("#no-search-item-modal").modal('show'); 
             } else {
                 result.forEach(binding => {
                     if (binding["item"]) {
                         searchedBindings.push(binding["item"]);
                     }
                 });
                 searchBindings = searchedBindings;
                  // update the count and filters data.
                 updateTheCountOfFilter(yearInstalled, categories, neighborhoods, materials);
                 resetTheFilters(yearInstalled, categories, neighborhoods, materials);
                 filterTheMarkers(yearInstalled, categories, neighborhoods, materials, true);
             }
         }
    }
    // filter search click event handler.
    document.getElementById('filters-search').addEventListener('click', (e) => {
        searchForBindings();
    });
    $('#search-box-input').keypress(function(event){
        var keycode = (event.keyCode ? event.keyCode : event.which);
        if(keycode == '13'){
            searchForBindings();
        }
    });

    // change event listener for the distance dropdown.
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
        // geolocate the user base on the above zoom levels.
        geolet.activate();
    });
}

/**
 * Gets the coordinated for the particular biniding.
 * 
 * @param {Object} binding - the binding data to get coordinate information.
 */
function getCoordinates(binding) {
    // wkt read api to read the coordintes of the current binding.
    if (binding["coords"]) {
        wkt.read(binding["coords"]);
    }
    return [wkt.components[0].y, wkt.components[0].x];
}

/**
 * When user search for a bindings then the facets filters will reset.
 * 
 * 
 */
function resetTheFilters(yearInstalled, categories, neighborhoods, materials) {
    yearInstalled.forEach((count, year) => {
        var id = "d" + year;
        document.getElementById(id).checked = true;
    });
    document.getElementById('date-selectall').checked = true;
    categories.forEach((count, currentCategory) => {
        var id = currentCategory.replace("; ", "-");
        document.getElementById(id).checked = true;
    });
    document.getElementById('category-selectall').checked = true;
    neighborhoods.forEach((count, neighborhood) => {
        var id = neighborhood.replace("; ", "-");
        document.getElementById(id).checked = true;
    });
    document.getElementById('neighborhood-selectall').checked = true;
    materials.forEach((count, material) => {
        var id = material.replace("; ", "-");
        document.getElementById(id).checked = true;
    });
    document.getElementById('material-selectall').checked = true;
}
/**
 * Filters the markers available on the map.
 * 
 * 
 */
function filterTheMarkers(yearInstalled, categories, neighborhoods, materials, searchFlag) {
    var filterBindings = [];
    // check if the method is called from search or while filtering the data.
    if (searchBindings.length > 0) {
        filterBindings = searchBindings;
    } else {
        filterBindings = bindings;
    }
    // clear all the markers before filtering the data.
    clusterMarkersGroup.clearLayers();
    // intial data.
    var tickedRanges = [],
        tickedCategories = [],
        tickedNeighbourhood = [],
        tickedMaterials = [];
    
    // iterate through yearInstalled and add all the checkboxes that are checked.
    yearInstalled.forEach((count, year) => {
        var id = "d" + year;
        if (document.getElementById(id).checked) {
            tickedRanges.push(year);
        }
    });

    // iterate through categories and add all the checkboxes that are checked.
    categories.forEach((count, currentCategory) => {
        var id = currentCategory.replace("; ", "-");
        if (document.getElementById(id).checked) {
            tickedCategories.push(currentCategory);
        }
    });

    // iterate through neighborhoods and add all the checkboxes that are checked.
    neighborhoods.forEach((count, neighborhood) => {
        var id = neighborhood.replace("; ", "-");
        if (document.getElementById(id).checked) {
            tickedNeighbourhood.push(neighborhood);
        }
    });

    // iterate through materials and add all the checkboxes that are checked.
    materials.forEach((count, material) => {
        var id = material.replace("; ", "-");
        if (document.getElementById(id).checked) {
            tickedMaterials.push(material);
        }
    });

    // adding markers based on the user selected filters.
    filterBindings.forEach(binding => {
        var currentYear = null,
            currentCategory = null,
            currentNeighborhood = null,
            currentMaterial = null;
        
        // initial checkings.
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
        // intital data.
        var yearRangeFlag = checkYearRange(tickedRanges, currentYear);
        var categoryFlag = checkCategory(tickedCategories, currentCategory);
        var neighborHoodeFlag = checkNeighbourHood(tickedNeighbourhood, currentNeighborhood);
        var materialFlag = checkMaterial(tickedMaterials, currentMaterial);

        // Checking whether filter should happen through search or not and updated the 
        // maps related to each filter facets based on searched criteria.
        if (searchFlag && yearRangeFlag && categoryFlag && neighborHoodeFlag && materialFlag) {
            // year installed checks
            if (binding["yearInstalled"]) {
                // check if the data has multiple values.
                if (binding["yearInstalled"].includes("or")) {
                    // get multiple years.
                    var years = binding["yearInstalled"].split(" or ");
                    // iterate through multiple years and update the filters data.
                    years.forEach(year => {
                        // format year.
                        var yearRange = customYearRange(parseInt(year));
                        var currentYear = yearInstalled.get(yearRange);
                        var id = "d" + yearRange;
                        // update the year installed section in left side filters.
                        if (document.getElementById(id).checked) {
                            yearInstalled.set(yearRange, currentYear + 1);
                        }
                    });
                } else {
                   // format year.
                    var yearRange = customYearRange(parseInt(binding["yearInstalled"]));
                    var currentYear = yearInstalled.get(yearRange);
                    var id = "d" + yearRange;
                    // update the year installed section in left side filters.
                    if (document.getElementById(id).checked) {
                        yearInstalled.set(yearRange, currentYear + 1);
                    }
                }
            } else {
                var currentYear = yearInstalled.get("NA");
                var id = "d" + "NA";
                // Unknown data for the year installed.
                if (document.getElementById(id).checked) {
                    yearInstalled.set("NA", currentYear + 1);
                }
            }
            // Categories filters parsing and updation.
            if (binding["categories"]) {
                // check if the data has multiple values.
                if (!binding["categories"].includes(";")) {
                    var currentCat = categories.get(binding["categories"]);
                    // format category.
                    var id = binding["categories"].replace("; ", "-");
                    // update the categories section in left side filters.
                    if (document.getElementById(id).checked) {
                        categories.set(binding["categories"], currentCat + 1);
                    }
                } else {
                    // format category.
                    var multipleCat = binding["categories"].split("; ");
                    // iterate through multiple categories
                    multipleCat.forEach(cat => {
                        var currentCat = categories.get(cat);
                        var id = cat.replace("; ", "-");
                        // update the categories section in left side filters.
                        if (document.getElementById(id).checked) {
                            categories.set(cat, currentCat + 1);
                        }
                    });
                }
            }
            // Neighborhoods filters parsing and updation.
            if (binding["neighborhoods"]) {
                // check if the data has multiple values.
                if (!binding["neighborhoods"].includes(";")) {
                    var currentNeig = neighborhoods.get(binding["neighborhoods"]);
                    // format neighbor.
                    var id = binding["neighborhoods"].replace("; ", "-");
                    // update the neighborhoods section in left side filters.
                    if (document.getElementById(id).checked) {
                        neighborhoods.set(binding["neighborhoods"], currentNeig + 1);
                    }
                } else {
                    var multipleNeig = binding["neighborhoods"].split("; ");
                    // iterate through multiple neighborhoods
                    multipleNeig.forEach(neighbor => {
                        var currentNeig = neighborhoods.get(neighbor);
                        // format neighbor.
                        var id = neighbor.replace("; ", "-");
                        // update the neighborhoods section in left side filters.
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
                     // format material.
                    var id = binding["materials"].replace("; ", "-");
                    // update the materials section in left side filters.
                    if (document.getElementById(id).checked) {
                        materials.set(binding["materials"], currentMaterial + 1);
                    }
                } else {
                    // format material.
                    var multipleMaterials = binding["materials"].split("; ");
                    // iterate through multiple materials.
                    multipleMaterials.forEach(material => {
                        var currentMaterial = materials.get(material);
                        // format material.
                        var id = material.replace("; ", "-");
                         // update the materials section in left side filters.
                        if (document.getElementById(id).checked) {
                            materials.set(material, currentMaterial + 1);
                        }
                    });
                }
            } else {
                // Material data unknown case.
                var currentMaterial = materials.get("NA");
                var id = "NA";
                if (document.getElementById(id).checked) {
                    materials.set("NA", currentMaterial + 1);
                }
            }
        }

        // add markers to the map.
        if (yearRangeFlag && categoryFlag && neighborHoodeFlag && materialFlag) {
            addMarkerToTheMap(binding);
        }
    });
    // update the counts if the search is active.
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
            // check if the current year is unknown or not.
            if (tickedRanges[i] != "NA") {
                // if there are multiple years then iterate through them.
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
        // if the checked years are unkown also it is still valid.
        if (tickedRanges.includes('NA')) {
            return true;
        }
    }

    // if we cant able to find the year choosen in the map.
    return false;
}

/***
 * Checks whether currentCategory is in the tickedCategories or not.
 */
function checkCategory(tickedCategories, currentCategory) {
    if (currentCategory) {
        // format category.
        var categories = currentCategory.split("; ");
        // iterate through checked items in category section and check for its validity.
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
         // format neighborhood.
        var neighborhoods = currentNeighborhood.split("; ");
        // iterate through checked items in neighborhood section and check for its validity.
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
         // format material.
        var materialsArr = currentMaterial.split("; ");
        for (let i = 0; i < tickedMaterials.length; i++) {
            if (materialsArr.includes(tickedMaterials[i])) {
                return true;
            }
        }
    } else {
        // material data unkown case.
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
    // set the count of all the year data to zero.
    yearInstalled.forEach((value, key, map) => map.set(key, 0));
    // set the count of all the categories data to zero.
    categories.forEach((value, key, map) => map.set(key, 0));
    // set the count of all the neighborhood data to zero.
    neighborhoods.forEach((value, key, map) => map.set(key, 0));
    // set the count of all the material data to zero.
    materials.forEach((value, key, map) => map.set(key, 0));
}

/***
 * Updates the label of facets in the filter options to the new count from the searched result.
 */
function updateTheCountLabels(yearInstalled, categories, neighborhoods, materials) {
    // iterate through categories and change the html labels to the most updated count 
    categories.forEach((count, currentCategory) => {
        var id = currentCategory.replace("; ", "-");
        var querySelect = "label[for='" + id + "']";
        // change the inner html.
        document.querySelector(querySelect).innerHTML = "<label for = '" + id + "'> " + currentCategory + " (" + count + ")" + "</label>";
    });

    // iterate through neighborhoods and change the html labels to the most updated count 
    neighborhoods.forEach((count, neighborhood) => {
        var id = neighborhood.replace("; ", "-");
        var querySelect = "label[for='" + id + "']";
        // change the inner html.
        document.querySelector(querySelect).innerHTML = "<label for = '" + id + "'> " + neighborhood + " (" + count + ")" + "</label>";
    });

    // iterate through materials and change the html labels to the most updated count 
    materials.forEach((count, material) => {
        var id = material.replace("; ", "-");
        var querySelect = "label[for='" + id + "']";
        // change the inner html.
        document.querySelector(querySelect).innerHTML = "<label for = '" + id + "'> " + material + " (" + count + ")" + "</label>";
    })

    // iterate through yearInstalled and change the html labels to the most updated count 
    yearInstalled.forEach((count, year) => {
        var id = "d" + year;
        var querySelect = "label[for='" + id + "']";
        // change the inner html.
        document.querySelector(querySelect).innerHTML = "<label for = '" + id + "'> " + year + " (" + count + ")" + "</label>";
    });
}

// code related to slide in window panel on left side (left hand filters).
const menuItems = document.querySelectorAll(".menu-item");
const sidebar = document.querySelector(".sidebar");
const buttonClose = document.querySelector(".close-button");

// iterate through all the menu section in left hand filers and add click event listerners.
menuItems.forEach((item) => {
    item.addEventListener("click", (e) => {
        const target = e.target;
        // add class name to the menu.
        if (
            target.classList.contains("active-item") ||
            !document.querySelector(".active-sidebar")
        ) {
            document.body.classList.toggle("active-sidebar");
        }

              // show content
        // showContent(target.dataset.item);
        // add active class to menu item
        // document.

        addRemoveActiveItem(target, "active-item");
    });
});

// close sidebar when click on close button
// buttonClose.addEventListener("click", () => {
//     // close the filter on left hand.
//     closeSidebar();
// });

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
    // show the content.
    addRemoveActiveItem(idItem, "active-content");
}

// --------------------------------------------------
// close when click esc
document.addEventListener("keydown", function(event) {
    // if pressed key is escape then close the side bar.
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


$('#short-sidebar-icon').on('click', function () {
    // console.log(map)
    $('#sidebar').toggleClass('display-none');
    $('#short-sidebar').toggleClass('display-none');
    map.zoomOut(0.75);
});

$('#sidebar-icon').on('click', function () {
    // console.log(map)
    $('#sidebar').toggleClass('display-none');
    $('#short-sidebar').toggleClass('display-none');
    map.zoomIn(0.75);
});
});

