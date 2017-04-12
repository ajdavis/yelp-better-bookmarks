yelp-better-bookmarks
=====================

Scrape your Yelp bookmarks and display them in a much nicer interface with
Google Maps.

Requires Python 3.6 or later.

Scrape your bookmarks:

```
scrapy crawl yelp -o web/yelp-bookmarks.json -t json
```

Run the single-page app:

```
cd web; python3 -m http.server 
```

(Python isn't used for the frontend, I'm just showing a convenient way to run the app.)

Credits
-------

Scraping code forked from Yigao Shao's [yelp-scraper](github.com/Billibilli/yelp-scraper).
