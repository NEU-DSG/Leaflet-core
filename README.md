### Leaflet BRC project
A standalone Leaflet dev and demo page, intended to eventually be used to integrate Leaflet into various projects.

### project structure and files.
1. brc-leaflet.html file is the main entry point to the website, where all the libraries, plugins, CSS and JS scripts are loaded.
2. assets/css directory has all the css files related to the site.
3. assets/js directory has all the js files related to the site.
4. data is the folder where geojson and csv files are stored.

### How to run the website.
1. Download the zip file of the total project.
2. unzip the entire file in your local machine.
3. Go to the brc-leaflet.html file and run a local server in this page.
4. Once the server runs go to the server specific localhost url and port number to access the site.

### Libraries and plugins used:
1. Leaflet.js v1.0.0 (https://leafletjs.com/) -- Leaflet.js is a library used to create and manage maps. It serves as a foundation for integrating additional plugins that enhance map functionality. Removing this library would result in the inability to display maps.
2. Wicket for leaflet (https://github.com/arthur-e/Wicket) -- This library is utilized to parse location coordinates and inform Leaflet about the correct positioning of bindings. Removing this library would result in bindings not being visible on the map.
3. JQuery 3.1.0 (https://jquery.com/) -- This library is used to create story maps and link the markers to the corresponding cards on the right when the user scrolls. Removing this library would result in story maps not being available and not functioning properly.
4. Font Awesome v4.6.3 (https://fontawesome.com/). -- This library is used for icons. Removing this library would result in changes to icons and styles.

### Leaflet tiles provider resources:
1. https://leaflet-extras.github.io/leaflet-providers/preview/
2. https://github.com/leaflet-extras/leaflet-providers
3. https://openmaptiles.org/docs/website/leaflet/
