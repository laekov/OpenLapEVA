let map;
let startLine;
let laps = {};
let rawtrail;
let lap_count = 0;

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

function parseFile(file) {
    if (file) {
		const type = file.type;
        const reader = new FileReader();
        reader.onload = function(e) {
            const contents = e.target.result;
			if (type === 'application/gpx+xml') {
				updateTrail(parseGPX(contents));
			} else {
				const binfile = new window.Buffer(contents);
				window.GPMFExtract(binfile).then(res => {		
					window.GoProTelemetry(res, {}, telemetry => {
						updateTrail(parseGPMF(telemetry[1].streams.GPS5));
					});
				});
			}
        };

		if (type === 'application/gpx+xml') {
			reader.readAsText(file);
		} else {
			const videoElement = document.getElementById('videoElement');
			videoElement.src = URL.createObjectURL(file);
			videoElement.load();
			// videoElement.play();
			document.getElementById('videoPlayer').style.display = 'block';

			reader.readAsArrayBuffer(file);
		}
    }
}

document.getElementById('file-input').addEventListener('change', function(event) {
    const file = event.target.files[0];
	parseFile(file);
});

function initMap() {
    map = L.map('map').setView([39.79422, 116.194925], 16);
	L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
		maxZoom: 20,
		attribution: 'Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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
			parseFile(file);
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
    points.sort((a, b) => { a.time - b.time; });
    console.log(`Find ${points.length} points in the gpx file`);
	return points;
}

function parseGPMF(gps5) {
	const points = [];
	for (let i = 0; i < gps5.samples.length; ++i) {
		const lat = gps5.samples[i].value[0];
		const lon = gps5.samples[i].value[1];
		const ele = gps5.samples[i].value[2];
		const time = gps5.samples[i].date;
		const cts = gps5.samples[i].cts;
		const speed = gps5.samples[i].value[4];
		points.push({
			lat: lat,
			lon: lon,
			ele: ele,
			time: time,
			cts: cts,
			speed: speed
		});
	}
    console.log(`Find ${points.length} points in the video file`);
	rawtrail = points;
	return points;
}

function updateTrail(points) {
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
        splitIntoLaps(points, startLine);
        displaySpeedChart();
    } else {
		displayMap(points);
    }
}

function displayMap(points, color='red', show=true, scale=true) {
    if (!map) initMap();
    const coordinates = points.map(point => [point.lat, point.lon]);
    const out = L.polyline(coordinates, { color: color });
    if (show) {
        out.addTo(map);
    }
	if (scale) {
		map.fitBounds(coordinates);
	}
	return out;
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
    const posses = [];
    var j = 0;
    for (let i = 1; i < points.length; i++) {
        const p1 = points[j];
        const p2 = points[i];
        const distance = haversine_distance(p1.lat, p1.lon, p2.lat, p2.lon);
        const time_diff = (p2.time - p1.time) / 1000; // time diff in seconds
		if (time_diff < 0) {
            continue;
		}
		let speed;
		if ('speed' in p1 && 'speed' in p2) {
			speed  = (p1.speed + p2.speed) / 2 * 3.6;
		} else {
			speed = distance / time_diff; // speed in meters per second
			speed *= 3.6; // kph
		}
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
		var pos = {
            lat: (p1.lat + p2.lat) / 2,
            lon: (p1.lon + p2.lon) / 2
        }
		if ('cts' in p1 && 'cts' in p2) {
			pos.cts = (p1.cts + p2.cts) / 2;
		}
        posses.push(pos);
    }
    return [speeds, distances.slice(1), posses];
}


function createLap(points) {
	const lap_name = lap_count++;
	const speed_and_dis = calculate_speeds(points);
	const speeds = speed_and_dis[0];
	const distances = speed_and_dis[1];
	const times = points.slice(1).map(p => (p.time - points[0].time) * 1e-3);
	const laptime = times.slice(-1)[0];
	const color = colormap[lap_name % colormap.length];

	laps[lap_name] = {
		laptime: laptime,
		points: points,
		speeds: speeds,
        posses: speed_and_dis[2],
		distances: distances,
		times: times,
		color: color,
		trail: displayMap(points, color, false, false)
	};
}

function splitIntoLaps(points, startLine) {
    let currentLap = [];
    const startLineFeature = turf.lineString(startLine.geometry.coordinates);

    for (let i = 1; i < points.length; i++) {
        const p1 = points[i - 1];
        const p2 = points[i];
        const segment = turf.lineString([[p1.lon, p1.lat], [p2.lon, p2.lat]]);
        
        const intersection = turf.lineIntersect(segment, startLineFeature);

		if (intersection.features.length > 0 && currentLap.length > 30) {
			createLap(currentLap);
			currentLap = [p2];
		} else {
            currentLap.push(p2);
        }
    }
    
    if (currentLap.length > 0) {
		createLap(currentLap);
    }
}

var markers = {};

function showMarkerOnMap(idx, lat, lon, color) {
    if (!markers[idx]) {
        markers[idx] = L.circleMarker([lat, lon], {
            color: color,
            fillColor: color,
            fillOpacity: 0.5
        }).addTo(map);
    } else {
        markers[idx].setLatLng([lat, lon]);
    }
    map.panTo([lat, lon]);
}


function removeMarkerFromMap() {
    for (var i in markers) {
        map.removeLayer(markers[i]);
        delete markers[i];
    }
}

const videoElement = document.getElementById('videoElement');


function displaySpeedChart() {
	let lapSpeedTraces = [];

    const selector = document.getElementById('chart-selector');
    const selected = selector.value;

	for (var i in laps) {
		lapSpeedTraces.push({
            x: selected == 'distance' ? laps[i].distances : laps[i].times,
			y: laps[i].speeds,
			type: 'scatter',
			mode: 'lines',
			name: `Lap ${i} (${laps[i].laptime} s)`,
			yaxis: 'y1',
			visible: 'legendonly',
			line: { color: laps[i].color }
		});
	}
	
	const layout = {
		title: 'Lap Speeds Over Distance',
		xaxis: { title: selected == 'distance' ? 'Distance / km' : 'Time / s' },
		yaxis: { title: 'Speed (m/s)' }
	};
	Plotly.newPlot('speed-chart', lapSpeedTraces, layout);

	const chart = document.getElementById('speed-chart');
	chart.on('plotly_restyle', function(eventData) {
		const n = eventData[0].visible.length;
        if (!map) initMap();
		for (let i = 0; i < n; ++i) {
			const idx = eventData[1][i];
			if (eventData[0].visible[i] === true) {
				map.addLayer(laps[idx].trail);
                const coordinates = laps[idx].points.map(point => [point.lat, point.lon]);
                map.fitBounds(coordinates);
			} else {
				map.removeLayer(laps[idx].trail);
			}
		}
	});

    chart.on('plotly_hover', function(eventData) {
        var points = eventData.points;
        for (var i = 0; i < points.length; ++i) {
            var point = points[i];
            var lapIndex = point.curveNumber;
            var pointIndex = point.pointNumber;
			var point = laps[lapIndex].posses[pointIndex];
            var latitude = point.lat;
            var longitude = point.lon;
            showMarkerOnMap(lapIndex, latitude, longitude, laps[lapIndex].color);
			if (i === 0 && 'cts' in point) {
				videoElement.currentTime = point.cts / 1000;
			}
        }
    });

    chart.on('plotly_unhover', function(eventData) {
        removeMarkerFromMap();
    });
}

function findFrame(points, target) {
	let left = 0, right = points.length;
	while (left + 1 < right) {
		let mid = (left + right) >> 1;
		if (target < rawtrail[mid].cts) {
			right = mid;
		} else {
			left = mid + 1;
		}
	}
	return left;
}

videoElement.addEventListener("timeupdate", () => {
	const t = videoElement.currentTime * 1e3;
	if (rawtrail && 'cts' in rawtrail[0]) {
		let p = findFrame(rawtrail, t);
		showMarkerOnMap(0, rawtrail[p].lat, rawtrail[p].lon, 'red');
	}
});

document.getElementById('nextFrame').addEventListener('click', () => {
	const t = videoElement.currentTime * 1e3;
	let p = findFrame(rawtrail, t);
	if (rawtrail[p + 1].cts < t + 10) {
		++p;
	}
    videoElement.currentTime = rawtrail[p + 1].cts * 1e-3;
});

document.getElementById('prevFrame').addEventListener('click', () => {
	const t = videoElement.currentTime * 1e3;
	let p = findFrame(rawtrail, t);
	if (rawtrail[p - 1].cts > t - 10) {
		--p;
	}
    videoElement.currentTime = rawtrail[p - 1].cts * 1e-3;
});
