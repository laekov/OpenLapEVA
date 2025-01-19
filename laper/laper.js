let map;
let startLine;
let laps = Vue.reactive([]);
let lapsel = Vue.reactive([]);
let runs = {};
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
    'rgb(148, 103, 189)',
    'rgb(196, 156, 148)',
    'rgb(247, 182, 210)',
    'rgb(188, 189, 34)'
];

function getVideoElements() {
    let out = [];
    if (lapsel.length > 0) {
        for (var i in lapsel) {
            var lapIndex = lapsel[i];
            out.push(document.getElementById(`ve${lapIndex}`));
        }
    } else {
        out.push(document.getElementById('videoElement'));
    }
    return out;
}

function f3(v) {
    if (!v) {
        return v;
    }
    if (typeof(v) === 'string') {
        return v;
    }
    const s = String(v).split('.');
    if (s.length == 1) {
        return s[0] + '.000';
    } else {
        return s[0] + '.' + (s[1] + '000').slice(0, 3);
    }
};

function findFrame(points, target, getkey) {
    let left = 0, right = points.length;
    while (left + 1 < right) {
        let mid = (left + right) >> 1;
        if (target < getkey(points[mid])) {
            right = mid;
        } else {
            left = mid + 1;
        }
    }
    return left;
}

function parseFile(file) {
    if (file) {
        const type = file.name.split('.').at(-1).toLowerCase();
        const reader = new FileReader();
        runs[file.name] = {
            video: URL.createObjectURL(file)
        };
        laps.push({
            name: file.name,
            idx: 0,
            laptime: 'Processing',
            has_video: false
        });
        reader.onload = function(e) {
            const contents = e.target.result;
            if (type === 'gpx') {
                updateTrail(file.name, parseGPX(contents), false);
            } else {
                const binfile = new window.Buffer(contents);
                window.GPMFExtract(binfile).then(res => {
                    window.GoProTelemetry(res, {}, telemetry => {
                        var trail = null;
                        if (telemetry[1].streams.GPS5) {
                            trail = telemetry[1].streams.GPS5;
                        }
                        if (telemetry[1].streams.GPS9) {
                            trail = telemetry[1].streams.GPS9;
                        }
                        if (!trail) {
                            alert("GPS track is not found in the video. Please check the video or contact the developer");
                            return;
                        }
                        updateTrail(file.name, parseGPMF(trail), true);
                    });
                });
            }
        };

        if (type === 'gpx') {
            reader.readAsText(file);
        } else {
            const videoElement = document.getElementById('videoElement');
            videoElement.src = runs[file.name].video;
            videoElement.load();
            // videoElement.play();
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

function updateTrail(name, points, has_video) {
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
    runs[name].points = points;
    laps.pop();
    if (startLine) {
        runs[name].laps = splitIntoLaps(points, startLine);
        const fastest = runs[name].laps.slice(1, -1).map(l => l.laptime).reduce((a, b) => Math.min(a, b));
        for (var i in runs[name].laps) {
            runs[name].laps[i].name = name;
            runs[name].laps[i].idx = i;
            runs[name].laps[i].has_video = has_video;
            const gap = runs[name].laps[i].laptime - fastest;
            runs[name].laps[i].gap = gap == 0 ? '-' : '+' + f3(gap);
            laps.push(runs[name].laps[i]);
        }
        // displaySpeedChart();
    } else {
        displayMap(points);
    }
}

function getRelDelta(ref, l, wnd=10) {
    let dt = [];
    let ld = [];
    for (var i = 0, j = 0; j < l.posses.length; ++j) {
        const wnd_s = Math.max(i - wnd, 0);
        const wnd_e = Math.min(i + wnd, ref.posses.length - 1);

        const p = turf.point([l.posses[j].lon, l.posses[j].lat]);
        const qc = turf.point([ref.posses[i].lon, ref.posses[i].lat]);
        var dmin = turf.distance(p, qc);

        for (let k = wnd_s; k <= wnd_e; ++k) {
            const qn = turf.point([ref.posses[k].lon, ref.posses[k].lat]);
            const d = turf.distance(p, qn);
            if (d < dmin) {
                dmin = d;
                i = k;
            }
        }
        ld.push(ref.distances[i]);
        const tp = l.posses[j].time;
        const tq = ref.posses[i].time;
        dt.push((tp - tq) * 1e-3);
    }
    return {
        dt: dt,
        distance: ld
    };
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
            lon: (p1.lon + p2.lon) / 2,
            time: ((p2.time - points[0].time) + (p1.time - points[0].time)) / 2
        }
        if ('cts' in p1 && 'cts' in p2) {
            pos.cts = (p1.cts + p2.cts) / 2;
        } else {
            pos.cts = ((p2.time - points[0].time) + (p1.time - points[0].time)) / 2 / 1000;
        }
        posses.push(pos);
    }
    return [speeds, distances.slice(1), posses];
}


function createLap(points) {
    const speed_and_dis = calculate_speeds(points);
    const speeds = speed_and_dis[0];
    const distances = speed_and_dis[1];
    const times = points.slice(1).map(p => (p.time - points[0].time) * 1e-3);
    const laptime = times.slice(-1)[0];
    const color = colormap[0];

    return {
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
    let laps = [];
    let currentLap = [];
    const startLineFeature = turf.lineString(startLine.geometry.coordinates);

    for (let i = 1; i < points.length; i++) {
        const p1 = points[i - 1];
        const p2 = points[i];
        const segment = turf.lineString([[p1.lon, p1.lat], [p2.lon, p2.lat]]);

        const intersection = turf.lineIntersect(segment, startLineFeature);

        if (intersection.features.length > 0 && currentLap.length > 30) {
            laps.push(createLap(currentLap));
            currentLap = [p2];
        } else {
            currentLap.push(p2);
        }
    }

    if (currentLap.length > 0) {
        laps.push(createLap(currentLap));
    }
    return laps;
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

function displaySpeedChart() {
    let lapSpeedTraces = [];
    let dtTraces = [];

    const selector = document.getElementById('chart-selector');
    const selected = selector.value;

    map.eachLayer(layer => {
        if (layer instanceof L.Polyline) {
            map.removeLayer(layer);
        }
    });

    for (var i in lapsel) {
        const lap = laps[lapsel[i]];
        const delta = getRelDelta(laps[lapsel[0]], laps[lapsel[i]]);
        laps[lapsel[i]].delta = delta;
        const color = colormap[i % colormap.length];
        const t = f3(lap.laptime);
        lapSpeedTraces.push({
            x: selected == 'distance' ? delta.distance : lap.times,
            y: lap.speeds,
            type: 'scatter',
            mode: 'lines',
            name: `${lap.name} lap ${lap.idx} (${t} s)`,
            yaxis: 'y',
            line: { color: color }
        });

        if (selected === 'distance') {
            dtTraces.push({
                x: delta.distance,
                y: delta.dt,
                type: 'scatter',
                mode: 'lines',
                yaxis: 'y2',
                line: { color: color, dash: 'dash' },
                hoverinfo: 'none',
                showlegend: false
            });
        }

        lap.trail.setStyle({ color: color });
        map.addLayer(lap.trail);
        const coordinates = lap.points.map(point => [point.lat, point.lon]);
        map.fitBounds(coordinates);
    }

    let layout = {
        title: 'Lap Speeds Over Distance',
        xaxis: { title: selected == 'distance' ? 'Distance / km' : 'Time / s' },
        yaxis: {
            title: 'Speed (m/s)',
            side: 'left',
            showgrid: true
        }
    };
    if (selected === 'distance') {
        layout.yaxis2 = {
            title: 'Time Delta / s',
            side: 'right',
            overlaying: 'y',
            showgrid: false,
            zeroline: false
        };
    }
    Plotly.newPlot('speed-chart', lapSpeedTraces.concat(dtTraces), layout);

    const chart = document.getElementById('speed-chart');
    const selfn = function(eventData) {
        getVideoElements().map(v => v.pause());
        var curve_points = eventData.points;
        let delta = false;
        for (var i = 0; i < curve_points.length; ++i) {
            var curve_point = curve_points[i];
            if (curve_point.yaxis._id == 'y2') {
                continue;
            }
            var lapIndex = lapsel[curve_point.curveNumber];
            const color = colormap[curve_point.curveNumber % colormap.length];
            var pointIndex = curve_point.pointNumber;
            var point = laps[lapIndex].posses[pointIndex];
            var latitude = point.lat;
            var longitude = point.lon;
            // showMarkerOnMap(lapIndex, latitude, longitude, colormap[color]);
            if ('cts' in point) {
                document.getElementById(`ve${lapIndex}`).currentTime = point.cts / 1000;
            }
            if (selected === 'distance') {
                delta = laps[lapIndex].distances[pointIndex];
            } else {
                delta = point.cts - laps[lapIndex].posses[0].cts;
            }
            if (!laps[lapIndex].has_video) {
                showMarkerOnMap(lapIndex, point.lat, point.lon, color);
            }
        }
        if (!delta) {
            return;
        }
        for (var i in lapsel) {
            if (!curve_points.includes(i)) {
                const lapIndex = lapsel[i];
                let dt;
                if (selected === 'distance') {
                    const p = findFrame(laps[lapIndex].delta.distance, delta, x => x);
                    dt = laps[lapIndex].posses[p].cts / 1e3
                } else {
                    dt = (laps[lapIndex].posses[0].cts + delta) / 1000;
                }
                if (laps[lapIndex].has_video) {
                    document.getElementById(`ve${lapIndex}`).currentTime = dt;
                }
            }
        }
    };

    chart.on('plotly_hover', selfn);
    chart.on('plotly_click', selfn);


    chart.on('plotly_unhover', function(eventData) {
        removeMarkerFromMap();
    });
}

const { createApp, ref } = Vue;

createApp({
    setup() {
        const data = ref(laps);
        const selectedRows = ref(lapsel);

        const singleClick = (index) => {
            if (!selectedRows.value.includes(index)) {
                selectedRows.value.push(index);
            } else {
                selectedRows.value.splice(selectedRows.value.indexOf(index));
            }
            emitEvent();
        };

        const doubleClick = (index) => {
            selectedRows.value.splice(0);
            selectedRows.value.push(index);
            emitEvent();
        };

        const emitEvent = () => {
            displaySpeedChart();
        };

        const isSelected = (index) => {
            return selectedRows.value.includes(index);
        };

        const clearLaps = () => {
            laps.splice(0, laps.length);
            lapsel.splice(0, lapsel.length);
            startLine = undefined;
        };

        return {
            data,
            selectedRows,
            singleClick,
            doubleClick,
            clearLaps,
            isSelected,
            f3,
            laps: ref(laps),
            runs: ref(runs),
            colormap: ref(colormap)
        };
    }
}).mount('#laptable');

createApp({
    setup() {
        const selectedRows = ref(lapsel);

        const handleVeUpdate = () => {
            const ves = getVideoElements();
            for (var i = 0; i < lapsel.length; ++i) {
                const t = ves[i].currentTime * 1e3;
                var lapIndex = lapsel[i];
                const points = laps[lapIndex].points;
                let p = findFrame(points, t, p => p.cts);
                showMarkerOnMap(lapIndex, points[p].lat, points[p].lon,
                    colormap[i % colormap.length]);
            }
        };

        const handleRawUpdate = () => {
            const videoElement = document.getElementById('videoElement');
            const t = videoElement.currentTime * 1e3;
            if (rawtrail && 'cts' in rawtrail[0]) {
                let p = findFrame(rawtrail, t, p => p.cts);
                showMarkerOnMap(0, rawtrail[p].lat, rawtrail[p].lon, 'red');
            }
        };

        const nextFrame = () => {
            const videoElement = document.getElementById('videoElement');
            const t = videoElement.currentTime * 1e3;
            let p = findFrame(rawtrail, t, p => p.cts);
            if (rawtrail[p + 1].cts < t + 100) {
                ++p;
            }
            videoElement.currentTime = rawtrail[p + 1].cts * 1e-3;
        };

        const prevFrame = () => {
            const videoElement = document.getElementById('videoElement');
            const t = videoElement.currentTime * 1e3;
            let p = findFrame(rawtrail, t);
            if (rawtrail[p - 1].cts > t - 100) {
                --p;
            }
            videoElement.currentTime = rawtrail[p - 1].cts * 1e-3;
        };

        const play = () => {
            getVideoElements().map(v => v.play());
        };

        const pause = () => {
            getVideoElements().map(v => v.pause());
        };

        return {
            laps: ref(laps),
            runs: ref(runs),
            colormap: ref(colormap),
            handleRawUpdate,
            handleVeUpdate,
            nextFrame,
            prevFrame,
            play,
            pause,
            selectedRows
        };
    }
}).mount('#lapvideos');

