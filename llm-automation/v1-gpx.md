好的，我来尝试实现这个功能。首先，我需要一个网页，让用户可以上传GPX文件，然后解析这个文件，提取轨迹数据和速度数据，最后在地图上显示轨迹，并在另一个图表中显示速度变化。

另外，还需要添加一个计圈功能，用户可以标定一个起点线，然后根据这个线将轨迹分成多个圈，统计每圈的圈速，并分别画出每圈的速度变化图。

首先，我需要了解GPX文件的结构，以便能够解析它。GPX（GPS Exchange Format）是一种XML格式，用于交换GPS数据，如航点、路线和航迹。

一个典型的GPX文件包含<trk>元素，里面包含<trkseg>（轨迹段），每个<trkseg>包含多个<trkpt>（轨迹点），每个<trkpt>有纬度和经度，可能还有时间戳和海拔等信息。

首先，我需要一个HTML页面，包含一个文件上传控件，一个地图容器，和一个图表容器。

我打算使用Leaflet.js来显示地图和轨迹，因为它是轻量级的，容易使用。对于图表，我将使用Plotly.js，因为它支持多种图表类型，包括线图和散点图，适合显示速度变化。

首先，我来搭建基本的HTML结构：

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GPX Analyzer</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
    <style>
        #map { height: 400px; }
        #speed-chart { height: 400px; }
    </style>
</head>
<body>
    <h1>GPX File Analyzer</h1>
    <input type="file" id="file-input" accept=".gpx">
    <div id="map"></div>
    <div id="speed-chart"></div>

    <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <script>
        // JavaScript code will go here
    </script>
</body>
</html>
```

接下来，我需要处理文件上传事件，当用户选择一个GPX文件时，读取文件内容，并解析其中的轨迹点。

首先，添加一个事件监听器到文件输入控件上：

```javascript
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
```

然后，定义parseGPX函数，用于解析GPX文件：

```javascript
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
        
        points.push({ lat: parseFloat(lat), lon: parseFloat(lon), ele: parseFloat(ele), time: new Date(time) });
    }
    
    // Now points array contains all track points
    displayMap(points);
    displaySpeedChart(points);
}
```

接下来，实现displayMap函数，在地图上显示轨迹。

首先，初始化地图：

```javascript
let map;

function initMap() {
    map = L.map('map').setView([0, 0], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

initMap();
```

然后，在displayMap中添加轨迹层：

```javascript
function displayMap(points) {
    if (!map) initMap();
    
    // Clear previous layers
    map.eachLayer(layer => {
        if (layer instanceof L Polyline) {
            map.removeLayer(layer);
        }
    });
    
    // Add points to map
    const coordinates = points.map(point => [point.lat, point.lon]);
    L.polyline(coordinates, { color: 'red' }).addTo(map);
    map.fitBounds(coordinates);
}
```

接下来，实现displaySpeedChart函数，显示速度图表。

首先，需要计算速度。速度可以由连续两个点之间的距离除以时间差得到。

定义一个函数来计算两个点之间的距离（使用haversine公式）：

```javascript
function haversine_distance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180; // φ, λ in radians
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}
```

然后，计算速度：

```javascript
function calculate_speeds(points) {
    const speeds = [];
    for (let i = 1; i < points.length; i++) {
        const p1 = points[i-1];
        const p2 = points[i];
        const distance = haversine_distance(p1.lat, p1.lon, p2.lat, p2.lon);
        const time_diff = (p2.time - p1.time) / 1000; // time diff in seconds
        const speed = distance / time_diff; // speed in meters per second
        speeds.push(speed);
    }
    return speeds;
}
```

然后，在displaySpeedChart中使用Plotly绘制速度图表：

```javascript
function displaySpeedChart(points) {
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
        title: 'Speed Over Time',
        xaxis: { title: 'Time' },
        yaxis: { title: 'Speed (m/s)' }
    };
    
    Plotly.newPlot('speed-chart', data, layout);
}
```

现在，基本的功能已经实现：上传GPX文件，显示轨迹地图和速度图表。

接下来，实现计圈功能。用户需要在地图上标定一个起点线，然后根据这个线将轨迹分成多个圈，统计每圈的圈速，并分别画出每圈的速度变化图。

首先，需要让用户在地图上绘制一条线作为起点线。可以使用Leaflet的绘制工具来实现。

引入Leaflet.draw库：

在HTML中添加：

```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.2/leaflet.draw.css" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.2/leaflet.draw.js"></script>
```

然后，修改initMap函数，添加绘制工具：

```javascript
function initMap() {
    map = L.map('map').setView([0, 0], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Add drawing controls
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
        // Handle the drawn layer, e.g., store it for later use
        startLine = layer.toGeoJSON();
    });
}
```

用户绘制一条线后，将其存储起来，以便后续使用。

定义一个变量来存储起点线：

```javascript
let startLine;
```

然后，在map的事件中捕获用户绘制的线，并存储起来。

接下来，需要根据这条线将轨迹分成多个圈。这需要确定轨迹点穿越起点线的时刻，从而划分出各个圈。

首先，需要检测轨迹是否穿越了起点线。这可以通过检查轨迹线段与起点线的交点来实现。

可以使用Turf.js库来处理地理空间分析，比如线段相交。

引入Turf.js：

在HTML中添加：

```html
<script src="https://cdn.jsdelivr.net/npm/@turf/turf/dist/turf.min.js"></script>
```

然后，定义一个函数来检测轨迹点是否穿越起点线。

首先，将轨迹点连接成线段，然后检查每条线段是否与起点线相交。

定义一个函数来分割轨迹成多个圈：

```javascript
function splitIntoLaps(points, startLine) {
    const laps = [];
    let currentLap = [];
    
    const startLineFeature = turf.lineString(startLine.coordinates);
    
    for (let i = 1; i < points.length; i++) {
        const p1 = points[i-1];
        const p2 = points[i];
        const segment = turf.lineString([[p1.lon, p1.lat], [p2.lon, p2.lat]]);
        
        const intersection = turf.lineIntersection(segment, startLineFeature);
        if (intersection) {
            if (currentLap.length > 0) {
                laps.push(currentLap);
                currentLap = [p2];
            }
        } else {
            currentLap.push(p2);
        }
    }
    
    if (currentLap.length > 0) {
        laps.push(currentLap);
    }
    
    return laps;
}
```

这个函数将轨迹点分成多个圈，每个圈是一个点数组。

然后，需要统计每圈的圈速，并分别画出每圈的速度变化图。

首先，定义一个函数来计算每圈的圈速：

```javascript
function calculateLapTimes(laps) {
    const lapTimes = [];
    for (let i = 0; i < laps.length; i++) {
        const lap = laps[i];
        const startTime = lap[0].time;
        const endTime = lap[lap.length - 1].time;
        const lapTime = (endTime - startTime) / 1000; // in seconds
        lapTimes.push(lapTime);
    }
    return lapTimes;
}
```

然后，修改displaySpeedChart函数，根据是否有laps来决定显示总的 speed 图还是每个 lap 的 speed 图。

可以添加一个切换按钮，让用户选择显示总的速度图还是分圈的速度图。

在HTML中添加一个选择器：

```html
<select id="chart-selector">
    <option value="total">Total Speed</option>
    <option value="laps">Lap Speeds</option>
</select>
```

然后，根据选择显示相应的图表。

修改displaySpeedChart函数：

```javascript
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
            xaxis: { title: 'Time' },
            yaxis: { title: 'Speed (m/s)' }
        };
        
        Plotly.newPlot('speed-chart', data, layout);
    } else if (selected === 'laps' && laps && laps.length > 0) {
        const lapSpeedTraces = laps.map((lap, index) => {
            const speeds = calculate_speeds(lap);
            const times = lap.slice(1).map(p => p.time.toISOString());
            return {
                x: times,
                y: speeds,
                type: 'scatter',
                mode: 'lines+markers',
                name: `Lap ${index + 1}`,
                yaxis: 'y1',
                line: { color: colormap[index % colormap.length] },
                marker: { color: colormap[index % colormap.length] }
            };
        });
        
        const layout = {
            title: 'Lap Speeds Over Time',
            xaxis: { title: 'Time' },
            yaxis: { title: 'Speed (m/s)' }
        };
        
        Plotly.newPlot('speed-chart', lapSpeedTraces, layout);
    }
}
```

这里假设colormap是一个颜色数组，用于区分不同圈的速度图。

定义colormap：

```javascript
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
```

最后，在parseGPX函数中，如果有了起点线，就分割轨迹成laps，并传递给displaySpeedChart。

修改parseGPX函数：

```javascript
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
        
        points.push({ lat: parseFloat(lat), lon: parseFloat(lon), ele: parseFloat(ele), time: new Date(time) });
    }
    
    // Display map
    displayMap(points);
    
    // Check if start line is defined
    if (startLine) {
        const laps = splitIntoLaps(points, startLine);
        displaySpeedChart(points, laps);
    } else {
        displaySpeedChart(points, null);
    }
}
```

还需要在用户绘制起点线后，调用parseGPX函数重新解析GPX文件，因为现在有了起点线信息。

在map的事件中，当用户绘制完起点线后，重新解析GPX文件：

```javascript
map.on(L.Draw.Event.CREATED, function(event) {
    const layer = event.layer;
    drawnItems.addLayer(layer);
    startLine = layer.toGeoJSON();
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
```

这样，当用户绘制起点线后，会重新解析GPX文件，并根据起点线分割轨迹成laps，然后在速度图表中可以选择显示总的速度图或分圈的速度图。

最后，可能需要添加一些用户界面元素，比如按钮或下拉菜单，来控制显示选项。

此外，还需要处理一些边缘情况，比如没有时间戳的轨迹点，或者轨迹点时间不连续的情况。

还需要考虑性能问题，因为如果GPX文件很大，包含成千上万的轨迹点，计算速度和分割laps可能会比较耗时。

可以考虑对轨迹进行采样，减少点的数量，以提高性能。

另外，可以添加一些提示或加载动画，当文件上传和解析时，给予用户反馈。

总之，这个功能相对复杂，需要逐步实现和调试，确保每个部分都能正常工作，并且整个流程是流畅的。

**总结步骤：**

1. 创建HTML结构，包含文件上传控件、地图容器和图表容器。

2. 使用Leaflet.js初始化地图，并添加TileLayer。

3. 使用Plotly.js初始化速度图表。

4. 添加文件上传事件监听器，读取上传的GPX文件内容。

5. 解析GPX文件，提取轨迹点的经纬度、海拔和时间信息。

6. 在地图上显示轨迹点，并适应地图视图。

7. 计算轨迹点之间的速度，并在速度图表中显示。

8. 添加Leaflet.draw控件，允许用户绘制起点线。

9. 使用Turf.js检测轨迹点是否穿越起点线，从而分割轨迹成多个圈。

10. 统计每圈的圈速，并在速度图表中提供选项显示总的速度图或分圈的速度图。

11. 添加用户界面元素，如选择器，以便用户切换显示模式。

12. 处理性能和边缘情况，确保应用的稳定性和用户体验。

## 最终代码

为了实现上述功能，我们需要创建一个HTML文件，并在其中嵌入必要的JavaScript代码。以下是完整的代码示例：

### HTML部分

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GPX Analyzer</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.2/leaflet.draw.css" />
    <style>
        #map { height: 400px; }
        #speed-chart { height: 400px; }
    </style>
</head>
<body>
    <h1>GPX File Analyzer</h1>
    <input type="file" id="file-input" accept=".gpx">
    <select id="chart-selector">
        <option value="total">Total Speed</option>
        <option value="laps">Lap Speeds</option>
    </select>
    <div id="map"></div>
    <div id="speed-chart"></div>

    <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.2/leaflet.draw.js"></script>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@turf/turf/dist/turf.min.js"></script>
    <script>
        // JavaScript code will go here
    </script>
</body>
</html>
```

### JavaScript部分

```javascript
let map;
let startLine;

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
    map = L.map('map').setView([0, 0], 13);
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
        
        points.push({ lat: parseFloat(lat), lon: parseFloat(lon), ele: parseFloat(ele), time: new Date(time) });
    }
    
    displayMap(points);
    
    if (startLine) {
        const laps = splitIntoLaps(points, startLine);
        displaySpeedChart(points, laps);
    } else {
        displaySpeedChart(points, null);
    }
}

function displayMap(points) {
    if (!map) initMap();
    
    map.eachLayer(layer => {
        if (layer instanceof L.Polyline) {
            map.removeLayer(layer);
        }
    });
    
    const coordinates = points.map(point => [point.lat, point.lon]);
    L.polyline(coordinates, { color: 'red' }).addTo(map);
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
    for (let i = 1; i < points.length; i++) {
        const p1 = points[i - 1];
        const p2 = points[i];
        const distance = haversine_distance(p1.lat, p1.lon, p2.lat, p2.lon);
        const time_diff = (p2.time - p1.time) / 1000; // time diff in seconds
        const speed = distance / time_diff; // speed in meters per second
        speeds.push(speed);
    }
    return speeds;
}

function splitIntoLaps(points, startLine) {
    const laps = [];
    let currentLap = [];
    
    const startLineFeature = turf.lineString(startLine.coordinates);
    
    for (let i = 1; i < points.length; i++) {
        const p1 = points[i - 1];
        const p2 = points[i];
        const segment = turf.lineString([[p1.lon, p1.lat], [p2.lon, p2.lat]]);
        
        const intersection = turf.lineIntersection(segment, startLineFeature);
        if (intersection) {
            if (currentLap.length > 0) {
                laps.push(currentLap);
                currentLap = [p2];
            }
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
            xaxis: { title: 'Time' },
            yaxis: { title: 'Speed (m/s)' }
        };
        
        Plotly.newPlot('speed-chart', data, layout);
    } else if (selected === 'laps' && laps && laps.length > 0) {
        const lapSpeedTraces = laps.map((lap, index) => {
            const speeds = calculate_speeds(lap);
            const times = lap.slice(1).map(p => p.time.toISOString());
            return {
                x: times,
                y: speeds,
                type: 'scatter',
                mode: 'lines+markers',
                name: `Lap ${index + 1}`,
                yaxis: 'y1',
                line: { color: colormap[index % colormap.length] },
                marker: { color: colormap[index % colormap.length] }
            };
        });
        
        const layout = {
            title: 'Lap Speeds Over Time',
            xaxis: { title: 'Time' },
            yaxis: { title: 'Speed (m/s)' }
        };
        
        Plotly.newPlot('speed-chart', lapSpeedTraces, layout);
    }
}
```

### 说明

1. **HTML部分**:
    - 包含文件上传控件、地图容器和速度图表容器。
    - 引入Leaflet、Leaflet.draw、Plotly和Turf.js库。

2. **JavaScript部分**:
    - 初始化地图和绘制控制。
    - 处理文件上传事件，解析GPX文件并提取轨迹点。
    - 在地图上显示轨迹。
    - 计算并显示速度图表。
    - 允许用户绘制起点线，并根据起点线分割轨迹成圈，显示每圈的速度图表。

通过这种方式，用户可以上传GPX文件，查看轨迹和速度图表，并通过绘制起点线进行计圈分析。
Round 0, Total generation time 217.107 s
--------------------------
