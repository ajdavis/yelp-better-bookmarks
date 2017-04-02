import json

import gmplot


gmap = gmplot.GoogleMapPlotter(37.428, -122.145, 16)

for biz in json.load(open('scraped_yelp.json', encoding='utf-8')):
    gmap.marker(lat=biz['latitude'], lng=biz['longitude'],
                color='cornflowerblue', title=biz['name'].encode('utf-8'))
# gmap.plot(latitudes, longitudes, 'cornflowerblue', edge_width=10)
# gmap.scatter(more_lats, more_lngs, '#3B0B39', size=40, marker=False)
# gmap.scatter(marker_lats, marker_lngs, 'k', marker=True)
# gmap.heatmap(heat_lats, heat_lngs)

gmap.draw("mymap.html")
