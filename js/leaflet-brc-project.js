/**
 * This document example-filtering.js contains code related to the mapping the point 
 * in for the sample json data which is available in the file path 'res/data/query.json'.
 */

//A world Map is created here using leaflet js. 
var map = L.map('map', {
    zoom: 13,
    center: [42.361145, -71.057083]
});

// Base tile creation and setup (stadia maps is being used here for tile layers).     
var tiles = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', {
    maxZoom: 18,
    minZoom: 11,
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
    id: 'mapbox/streets-v11',
    tileSize: 512,
    zoomOffset: -1
}).addTo(map);

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

// geolet is a plugin, which will show the current location marker on the map.
var geolet = L.geolet({
    position: 'topleft'
}).addTo(map);


//Fetching the json data to parse, from the file path 'res/data/query.json'.
fetch('./res/data/query.json')
    .then(response => response.json())
    .then(jsonData => {
        bindings = jsonData;
        generateMarkersOnMap(jsonData);
    });

/** Geo-let event which is called when user click on the locate me. */
var zoomLevel = 23;
map.on('geolet_success', function(data) {
    map.setView([data.latlng["lat"], data.latlng["lng"]], zoomLevel);
})


// Cluster markers setup (It helps to setup the cluster).
var markers = L.markerClusterGroup({
    zoomToBoundsOnClick: true
});

// wkt string literal parser.
var wkt = new Wkt.Wkt();
var myIcon = L.icon({
    iconUrl: '../res/images/marker-icon-blue.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -35],
});

var bindings = [];
var searchBindings = [];
/***
 *  Creates the html string for the popups in the map.
 * 
 * @param {Object} binding - the binding data for a popup.
 */
function createPopUpHtmlForBinding(binding) {
    let popUpHtml = "<div class='location-point-popup'>";
    if (binding["image"]) {
        popUpHtml += "<div class='popup-image-section'> <img src='" + binding["image"] + "'></div>";
    }
    popUpHtml += "<h1 class='location-point-popup-header'>";
    if (binding["workLabel"]) {
        popUpHtml += binding["workLabel"] + "</h1><ul class='popup-list'></ul>";
    } else {
        popUpHtml += "Location Information</h1><ul class='popup-list'></ul>";
    }
    if (binding["yearInstalled"]) {
        popUpHtml += "<li class='popup-item'>";
        popUpHtml += "<strong>Year: </strong> " + binding["yearInstalled"].replace(" or", ',');
        popUpHtml += "</li>";
    }
    if (binding["creators"]) {
        popUpHtml += "<li class='popup-item'>";
        popUpHtml += "<strong>Artist:</strong> " + binding["creators"].replace(";", ',');
        popUpHtml += "</li>";
    }
    if (binding["materials"]) {
        popUpHtml += "<li class='popup-item'>";
        popUpHtml += "<strong>Material:</strong> " + binding["materials"].replace(";", ',');
        popUpHtml += "</li>";
    }
    if (binding["address"]) {
        popUpHtml += "<li class='popup-item'>";
        popUpHtml += "<strong>Location:</strong> " + binding["address"];
        popUpHtml += "</li>";
    }
    if (binding["work"]) {
        popUpHtml += "<li class='popup-item more-info-section'>";
        popUpHtml += "<a href = '" + binding["work"] + "' class='more-info-span' target='_blank'>More information.... <img src='res/images/external-link.svg' width='10' heigth='10'></a></li>"
    }
    popUpHtml += '</div>';
    return popUpHtml;
}

/**
 * Adds the binding data to the map.
 * 
 * @param {Object} binding - the binding to be added to the map.
 */
function addMarkerToTheMap(binding) {
    var marker = L.marker(getCoordinates(binding), {
        icon: myIcon,
        markerInformation: binding
    });
    let popUpHtml = createPopUpHtmlForBinding(binding);
    marker.bindPopup(popUpHtml);
    markers.addLayer(marker);
}

/***
 * Custom year ranges as per the count.
 * 
 * @param {Number} fromDate - the given date from json.
 */
function customYearRange(fromDate) {
    var yearRange = "";
    if (fromDate >= 1700 && fromDate <= 1799) {
        yearRange = "1700-1799";
    } else if (fromDate >= 1800 && fromDate <= 1899) {
        yearRange = "1800-1899";
    } else if (fromDate >= 1900 && fromDate <= 1929) {
        yearRange = "1900-1929";
    } else if (fromDate >= 1930 && fromDate <= 1969) {
        yearRange = "1930-1969";
    } else if (fromDate >= 1970) {
        var starDate = fromDate - (fromDate % 10)
        yearRange = starDate + "-" + (starDate + 9);
    }
    return yearRange;
}

/***
 * Generates markers on the map from the parse json data
 * 
 * @param {Object} jsonData - the parsed json data.
 */
function generateMarkersOnMap(jsonData) {
    var categories = new Map();
    var neighborhoods = new Map();
    var yearInstalled = new Map();
    var materials = new Map();
    var minYear = Number.MAX_SAFE_INTEGER,
        maxYear = Number.MIN_SAFE_INTEGER;

    // parsing through the json/jsonData to add markers to the map and to genarate filters on left side.
    jsonData.forEach(binding => {
        // Year Installed filters parsing and updation.
        if (binding["yearInstalled"]) {
            if (binding["yearInstalled"].includes("or")) {
                var years = binding["yearInstalled"].split(" or ");
                years.forEach(year => {
                    minYear = Math.min(minYear, parseInt(year));
                    maxYear = Math.max(maxYear, parseInt(year));
                    var yearRange = customYearRange(parseInt(year));
                    var currentYear = yearInstalled.get(yearRange);
                    if (currentYear === undefined) {
                        yearInstalled.set(yearRange, 1);
                    } else {
                        yearInstalled.set(yearRange, currentYear + 1);
                    }
                });
            } else {
                minYear = Math.min(minYear, parseInt(binding["yearInstalled"]));
                maxYear = Math.max(maxYear, parseInt(binding["yearInstalled"]));
                var yearRange = customYearRange(parseInt(binding["yearInstalled"]));
                var currentYear = yearInstalled.get(yearRange);
                if (currentYear === undefined) {
                    yearInstalled.set(yearRange, 1);
                } else {
                    yearInstalled.set(yearRange, currentYear + 1);
                }
            }
        } else {
            var currentYear = yearInstalled.get("NA");
            if (currentYear === undefined) {
                yearInstalled.set("NA", 1);
            } else {
                yearInstalled.set("NA", currentYear + 1);
            }
        }
        // Categories filters parsing and updation.
        if (binding["categories"]) {
            if (!binding["categories"].includes(";")) {
                var currentCat = categories.get(binding["categories"]);
                if (currentCat === undefined) {
                    categories.set(binding["categories"], 1);
                } else {
                    categories.set(binding["categories"], currentCat + 1);
                }
            } else {
                var multipleCat = binding["categories"].split("; ");
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

    // generating html for the filters category of art section.
    categories.forEach((count, currentCategory) => {
        var id = currentCategory.replace("; ", "-");
        if (!document.getElementById(id)) {
            var htmlString = "<div class = 'list-item'> <input type = 'checkbox' id = '" +
                id + "' name='" + id + "'" + "checked>" + "<label for = '" + id + "'> " + currentCategory + " (" + count + ")" +
                "</label></div>";
            document.getElementById("art-category-section").insertAdjacentHTML('beforeend', htmlString);
            document.getElementById(id).addEventListener('change', (e) => {
                filterTheMarkers(yearInstalled, categories, neighborhoods, materials, false);
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
                filterTheMarkers(yearInstalled, categories, neighborhoods, materials, false);
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
                filterTheMarkers(yearInstalled, categories, neighborhoods, materials, false);
            })
        }
    })

    // generating html for the filters year installed section (Decade wise).
    yearInstalled.forEach((count, year) => {
        var id = "d" + year;
        if (!document.getElementById(id)) {
            var htmlString = "<div class = 'list-item'> <input type = 'checkbox' id = '" +
                id + "' name='" + id + "'" + "checked>" + "<label for = '" + id + "'> " + year + " (" + count + ")" + "</label></div>";
            document.getElementById("date-facet-section").insertAdjacentHTML('beforeend', htmlString);
            document.getElementById(id).addEventListener('change', (e) => {
                filterTheMarkers(yearInstalled, categories, neighborhoods, materials, false);
            })
        }
    });

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
            updateTheCountOfFilter(searchedBindings, yearInstalled, categories, neighborhoods, materials);
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

        if (yearRangeFlag && categoryFlag && neighborHoodeFlag && materialFlag) {
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

function updateTheCountOfFilter(result, yearInstalled, categories, neighborhoods, materials) {
    yearInstalled.forEach((value, key, map) => map.set(key, 0));
    categories.forEach((value, key, map) => map.set(key, 0));
    neighborhoods.forEach((value, key, map) => map.set(key, 0));
    materials.forEach((value, key, map) => map.set(key, 0));
}

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