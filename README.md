Lap Time *E*xtraction and *V*isualization for *A*nalysis
===

We enjoy karting and auto racing.
As we want to improve our lap time, we want to analyze the telementry, but the commercial viehcles do not have any recording equipement.
Race Chrono / Garmin Catalyst / MoTeC / whatever lap time recording and analysis software are expensive.

What if we can simply extract and compare the lap times using the LRV / MP4 file that our GoPros record together with the video?
Or even the GPX file taken down by the phone or sport watch?
laekov is developing OpenLapEVA for itself and anyone interested in driving and coding.

Here is [A simple demo of OpenLapEVA](https://laekov.com.cn/l/aper/) showing the current development of this repository.

## Roadmap

* [x] Upload GPX file
* [x] Drawing or automatic matching the start/finish lines and break the trail into laps
* [x] Smooth the speed curve and plot with distance
* [x] Show / hide trails according to lap selection
* [x] Indicate current location on the map according to selection on the speed curve
* [x] Upload LRV / MP4 file
  * [x] Extract GPS data (and speed which is more accurate)
  * [x] Synchronous video play and track movement
  * [x] Comparing multiple videos
* [ ] Start / finish lines at different locations (for rallying, dh cycling, and etc.)
* [ ] Map lap distances to lap 0 for more accurate x axis
  * [ ] Display time loss / gain between two laps
* [ ] (endless) UI improvement

## Contribution

Welcome! Please PR directly.

## Acknowledgement

Special acknowledgements to the LLMs that helps laekov boost the coding efficiency LoL.
