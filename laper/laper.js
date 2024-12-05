let map;
let startLine;

const start_lines = {
    'sdby-fengtai': turf.lineString([[116.194925, 39.794226], [116.195097, 39.794415]]),
    'sdby-aoyuan1314': turf.lineString([[116.389541,39.980746], [116.389766,39.980746]]),
    'sdby-chongli': turf.lineString([[115.464764,40.903743],[115.464785,40.903994]])
};

const colormap = [
    'rgb(16, 112, 2)', 
    'rgb(255, 127, 14)', 
    'rgb(31, 119, 180)', 
    'rgb(214, 39, 40)', 
    'rgb(127, 127, 127)', 
    'rgb(148, 103, 189)', 
    'rgb(196, 156, 148)', 
    'rgb(247, 182, 210)', 
    'rgb(199, 199, 199)', 
    'rgb(188, 189, 34)'
];

document.getElementById('file-input').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const contents = e.target.result;
            parseGPX(contents);
        };
        reader.readAsText(file);
    }
});

function initMap() {
    map = L.map('map').setView([39.79422, 116.194925], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    
    const drawPluginOptions = {
        position: 'topright',
        draw: {
            polygon: false,
            circle: false,
            marker: false,
            circlemarker: false,
            rectangle: false,
            polyline: { allowIntersection: false }
        },
        edit: {
            featureGroup: drawnItems
        }
    };
    
    const drawControl = new L.Control.Draw(drawPluginOptions);
    map.addControl(drawControl);
    
    map.on(L.Draw.Event.CREATED, function(event) {
        const layer = event.layer;
        drawnItems.addLayer(layer);
        startLine = layer.toGeoJSON();
        console.log(`Start Line updated. Coordinates are ${startLine.geometry.coordinates}`);
        // Re-parse GPX to apply laps
        const fileInput = document.getElementById('file-input');
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = function(e) {
                const contents = e.target.result;
                parseGPX(contents);
            };
            reader.readAsText(file);
        }
    });
}

initMap();

function parseGPX(xmlString) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlString, "application/xml");
    const trkpts = xml.getElementsByTagName("trkpt");
    
    const points = [];
    for (let i = 0; i < trkpts.length; i++) {
        const lat = trkpts[i].getAttribute("lat");
        const lon = trkpts[i].getAttribute("lon");
        const ele = trkpts[i].getElementsByTagName("ele")[0]?.textContent;
        const time = trkpts[i].getElementsByTagName("time")[0]?.textContent;
        
        if (i > 0 && new Date(time) - points.at(-1).time < 0) {
            const last_time = trkpts[i - 1].getElementsByTagName("time")[0]?.textContent;
            // console.log(`Reverse time at ${i} ${time} ${last_time}`);
        }
        points.push({ lat: parseFloat(lat), lon: parseFloat(lon), ele: parseFloat(ele), time: new Date(time) });
    }

    console.log(`Founds ${points.length} points in the file`);
    
    if (!startLine) {
        for (let i in start_lines) {
            var p = start_lines[i].geometry.coordinates[0];
            const distance = haversine_distance(points.at(-1).lat, points.at(-1).lon, p[1], p[0]);
            if (distance <= 3000) {
                console.log(`Startline matched with ${i} (distance ${distance} m)`);
                startLine = start_lines[i];
            }
        }
    }
    if (startLine) {
        const laps = splitIntoLaps(points, startLine);
        displaySpeedChart(points, laps);
    } else {
		displayMap(points);
        // displaySpeedChart(points, null);
    }
}

function displayMap(points, color='red') {
    if (!map) initMap();
    const coordinates = points.map(point => [point.lat, point.lon]);
    L.polyline(coordinates, { color: color }).addTo(map);
    map.fitBounds(coordinates);
}

function haversine_distance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

function calculate_speeds(points) {
    const speeds = [];
    const distances = [0];
    var j = 0;
    for (let i = 1; i < points.length; i++) {
        const p1 = points[j];
        const p2 = points[i];
        const distance = haversine_distance(p1.lat, p1.lon, p2.lat, p2.lon);
        const time_diff = (p2.time - p1.time) / 1000; // time diff in seconds
		if (time_diff < 0) {
            continue;
		}
        var speed = distance / time_diff; // speed in meters per second
		speed *= 3.6; // kph
        if (speeds.length > 0) {
            const a = (speed - speeds.at(-1)) / 3.6 / time_diff; // m/s^2
            if (Math.abs(a) > 80) { // A too large is not that possible
                // console.log(`Illegal acceleration: ${a}`);
                continue;
            } else {
                j = i;
            }
        }
        speeds.push(speed);
		distances.push(distances.at(-1) + distance * 1e-3); // km
    }
    return [speeds, distances.slice(1)];
}

function splitIntoLaps(points, startLine) {
    const laps = [];
    let currentLap = [];
    
    const startLineFeature = turf.lineString(startLine.geometry.coordinates);
    
    for (let i = 1; i < points.length; i++) {
        const p1 = points[i - 1];
        const p2 = points[i];
        const segment = turf.lineString([[p1.lon, p1.lat], [p2.lon, p2.lat]]);
        
        const intersection = turf.lineIntersect(segment, startLineFeature);

		if (intersection.features.length > 0 && currentLap.length > 30) {
			laps.push(currentLap);
			currentLap = [p2];
		} else {
            currentLap.push(p2);
        }
    }
    
    if (currentLap.length > 0) {
        laps.push(currentLap);
    }

    return laps;
}

function displaySpeedChart(points, laps) {
    const selector = document.getElementById('chart-selector');
    const selected = selector.value;
    
    if (selected === 'total') {
        const speeds = calculate_speeds(points);
        const times = points.slice(1).map(p => p.time.toISOString());
        
        const data = [{
            x: times,
            y: speeds,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Speed',
            yaxis: 'y1',
            line: { color: 'rgb(16, 112, 2)' },
            marker: { color: 'rgb(16, 112, 2)' }
        }];
        
        const layout = {
            title: 'Total Speed Over Time',
            xaxis: { title: 'Time (s)' },
            yaxis: { title: 'Speed (km/h)' }
        };
        
        Plotly.newPlot('speed-chart', data, layout);
    } else if (selected === 'laps' && laps && laps.length > 0) {
        const lapSpeedTraces = laps.slice(1, -1).map((lap, index) => {
			const speed_and_dis = calculate_speeds(lap);
            const speeds = speed_and_dis[0];
            const distances = speed_and_dis[1];
            const times = lap.slice(1).map(p => (p.time - lap[0].time) * 1e-3);
			const laptime = times.slice(-1)[0];
			displayMap(lap, colormap[index % colormap.length]);
            return {
                x: distances,
                y: speeds,
                type: 'scatter',
                mode: 'lines',
                name: `Lap ${index + 1} (${laptime} s)`,
                yaxis: 'y1',
				visible: 'legendonly',
                line: { color: colormap[index % colormap.length] },
                marker: { color: colormap[index % colormap.length] }
            };
        });
        
        const layout = {
            title: 'Lap Speeds Over Distance',
            xaxis: { title: 'Distance / km' },
            yaxis: { title: 'Speed (m/s)' }
        };
		if (document.getElementById('speed-chart').innerHTML == '') {        
			Plotly.newPlot('speed-chart', lapSpeedTraces, layout);
		} else {
			Plotly.addTraces('speed-chart', lapSpeedTraces);
		}
    }
}
