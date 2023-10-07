const configMaps = {
    center: [42.361145, -71.057083],
    zoom: 13,
    zoomControl: false,
    titleLayerMap: 'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    titleLayerAttribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
    tileMaxZoom: 19,
    tileMinZoom: 11,
    titleLayerOpenStreetMap: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    titleLayerOpenStreetAttribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    zoomPosition: 'topright',
    geoJsonWeight: 2,
    geoJsonOpacity: 1,
    geoJsonFillOpacity: 0,
    geoLetPosition: 'topright',
    enableHighAccuracy: true,
    zoomLevel : 23,
    bindingKeysObject : {
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
    },
    imageContainerMargin: 70,
    iconUrl: '/assets/images/leaflet/brc/marker-icon-2x-blue.png',
    shadowUrl: "/assets/images/leaflet/brc/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    boundsPadding: [20, 20],
    setViewZoom: 70,
    animateScrollTop: 5,
    fuseThreshold: 0.1,
    fuseKeys: [
                "workLabel",
                "creators",
                "workDescription",
                "depicted",
                "commemorated",
                "address",
                "yearInstalled"
            ],
    sparqlQuery : `select distinct ?work ?workDescription ?workLabel ?coords ?address
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
                        } group by ?work ?workDescription ?workLabel ?coords ?address`,
};

const configStoryMap = {
    center: [42.361145, -71.057083],
    zoom: 13,
    scrollWheelZoom: true,
    titleLayerMap: 'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    titleLayerOpenStreet: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    titleLayerAttribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
    titleLayerOpenStreetAttribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    bindingKeysObject : {
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
    },
    imageContainerMargin: 70,
    noImageURL: '/assets/images/leaflet/brc/no-image-available.jpg',
    iconUrl: '/assets/images/leaflet/brc/marker-icon-2x-blue.png',
    shadowUrl: "/assets/images/leaflet/brc/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    boundsPadding: [20, 20],
    redIconURL: '/assets/images/leaflet/brc/marker-icon-2x-red.png',
    setViewZoom: 70,
    animateScrollTop: 5,
    sparqlQuery : `select distinct ?work ?workDescription ?workLabel ?coords ?address
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
                        } group by ?work ?workDescription ?workLabel ?coords ?address`,
    subStoryMapCollections: {
        "collection1": {
            "description": "Home",
            "data":[]
        },
        "collection2": {
            "description":"45 Forsyth St",
            "data":["http://www.wikidata.org/entity/Q118105014", "http://www.wikidata.org/entity/Q118104991", "http://www.wikidata.org/entity/Q117225339", "http://www.wikidata.org/entity/Q117472504"]
        },
        "collection3": {
            "description": "40 Smith Street",
            "data":["http://www.wikidata.org/entity/Q110088879", "http://www.wikidata.org/entity/Q110088862", "http://www.wikidata.org/entity/Q107975711", "http://www.wikidata.org/entity/Q110088867"]
        }
        
    }
}

