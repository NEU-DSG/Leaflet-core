jQuery(function() {
    
    var cartoDBTile = L.tileLayer(configStoryMap.titleLayerMap, {
        attribution: configStoryMap.titleLayerAttribution
    })
    
    var openStreetTile = L.tileLayer(configStoryMap.titleLayerOpenStreet, {
        attribution: configStoryMap.titleLayerOpenStreetAttribution
    })
    
    var map = L.map('map', {
        center: configStoryMap.center,
        zoom: configStoryMap.zoom,
        scrollWheelZoom: configStoryMap.scrollWheelZoom,
        layers: [cartoDBTile,openStreetTile] 
    });
    
    var baseMaps = {
        "CartoDBMap": cartoDBTile,
        "OpenStreetMap": openStreetTile
    };
    
    var layerControl = L.control.layers(baseMaps).addTo(map);
    
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
    var url = new URL("https://query.wikidata.org/sparql?format=json&")
    // Addition paramaters like 'query' to apppend the Sparql Query.
    const params = new URLSearchParams();
    params.append('query', configStoryMap.sparqlQuery);
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

            // check for filters from the map.
            geoJsonData = checkforFilters(geoJsonData);

            // Finally create markers on the map.
            generateMarkersOnMap(geoJsonData);
        }
    }).catch(err => {
        // Error handling in case api failure.
        console.log("Some error happened with the api", err);
    });

    function checkforFilters(geoJsonData) {
        if (localStorage.getItem("properties")) {
            const properties = JSON.parse(localStorage.getItem("properties"));
            if (properties.hasOwnProperty("filteredData")) {
                const filterDataArr = properties["filteredData"]
                geoJsonData["features"] = geoJsonData["features"].filter((binding) => {   return filterDataArr.includes(binding["properties"]["work"]); })
            }
            localStorage.setItem("properties", JSON.stringify({}))
        }
        return geoJsonData;
    }
    /***
     * Convert the bindings from json to geojson.
     */
    function convertJsontoGeojson(bindings) {
        var geojson = {
            type: "FeatureCollection",
            features: [],
        };
        for (var i = 0; i < bindings.length; i++) {
            var featureObj = {
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
    
        for (const [key, value] of Object.entries(configStoryMap.bindingKeysObject)) {
            if (binding[key]) {
                popUpHtml += "<li class='popup-item'>";
                popUpHtml += "<strong>" + value + " </strong> " + binding[key];
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
    
    /***
     *  Creates the story maps based on the bindings.
     * 
     * @param {Object} layer - the current layer object.
     * @param {Object} feature - the current feature object.
     * @param {Object} jsonData - the total geojson data.
     */
    function createStoryMaps(layer, feature, jsonData) {
    
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
        var currentAreaTop = -300;
        var currentAreaBottom = 0;
        var currentBox = 0;
        // Calculating total height of blocks above active
        for (var i = 1; i < feature.properties['id']; i++) {
            currentAreaTop += $('div#container' + i).height() + configStoryMap.imageContainerMargin;
        }
        currentAreaBottom = currentAreaTop + $('div#container' + feature.properties['id']).height();
        $('div#contents').scroll(function() {
            if ($(this).scrollTop() >= currentAreaTop && $(this).scrollTop() < currentAreaBottom) {
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
    
    /***
     *  Generated the markers on the leaflet map.
     * 
     * @param {Object} jsonData - the total geojson data.
     */
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
                    const myIcon = L.icon({
                        iconUrl: configStoryMap.iconUrl,
                        iconSize: configStoryMap.iconSize,
                        iconAnchor: configStoryMap.iconAnchor,
                        popupAnchor: configStoryMap.popupAnchor,
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
            padding: configStoryMap.boundsPadding
        });
    }
    // This adds data as a new layer to the map
    function refreshLayer(data, map, coord, zoom) {
        // var dataLayer = L.geoJson(data);
        // dataLayer.addTo(map);
        map.setView([coord[1], coord[0]], configStoryMap.setViewZoom);
    }
    $("div#contents").animate({
        scrollTop: configStoryMap.animateScrollTop
    });
    });