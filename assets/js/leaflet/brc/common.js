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

async function fetchBindingsJSON(url) {
    // waiting until we receive the response
    const response = await fetch(url);
    // converting the format of response to json
    const bindingsJson = await response.json();
    // retur the json format of binding.
    return bindingsJson;
}

function invokeGetBindingsApi() {
    // Fetch api request for getting the bindings from the wikidata website.
    var url = new URL("https://query.wikidata.org/sparql?format=json&")
    // Addition paramaters like 'query' to apppend the Sparql Query.
    const params = new URLSearchParams();
    params.append('query', configMaps.sparqlQuery);
    // Apending the query param to the main url.
    url += params.toString()
    // This function is an helper method that is used to call the api of the wikidata.
    
    return fetchBindingsJSON(url)
}