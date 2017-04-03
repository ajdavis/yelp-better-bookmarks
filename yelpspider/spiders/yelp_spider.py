import json
import logging

from scrapy.spider import Spider, Request

from yelpspider.itemloaders import YelpspiderItemLoader


def safe_get(el, selector):
    value = el.css(selector).extract_first()
    if value is not None:
        return value.strip()

    return ''


def safe_set(item, key, el, selector):
    value = safe_get(el, selector)
    item[key] = value
    if not value:
        logging.warning("parsing %s from %s" % (key, el))


class YelpSpider(Spider):
    name = "yelp"
    allowed_domains = ["yelp.com"]
    start_urls = ["https://www.yelp.com/user_details_bookmarks"
                  "?userid=GHfBDZJn-n4DPxobB7Hg0w"]

    def parse(self, response):
        """Parse index pages of bookmarks"""
        for el in response.css('ul.ylist li'):
            url = safe_get(el, 'a[class*=biz-name]::attr(href)')
            if url:
                yield Request(response.urljoin(url),
                              callback=self.parse_biz_page)

        next_url = safe_get(response, 'a[class*=next]::attr(href)')
        if next_url:
            yield Request(response.urljoin(next_url),
                          callback=self.parse)

    def parse_biz_page(self, response):
        """Parse business detail page"""
        l = YelpspiderItemLoader(response=response)
        l.add_value('url', response.url)
        l.add_xpath('bizid', '//meta[@name="yelp-biz-id"]/@content')

        ldjson = json.loads(response.xpath(
            '//script[@type="application/ld+json"]/text()').extract()[0])

        l.add_value('name', ldjson['name'])

        addr_info = ldjson.get('address', {})
        l.add_value('address', ', '.join(map(
            lambda x: addr_info.get(x) or '',
            ['streetAddress', 'addressLocality', 'addressRegion'])).strip(', '))

        rating = ldjson.get('aggregateRating', {}).get('ratingValue')
        if rating:
            try:
                l.add_value('rating', round(float(rating), 2))
            except Exception:
                logging.exception("extracting rating from '%s'" % rating)

        # This is series of local currency symbols like "$$".
        price_range = ldjson.get('priceRange')
        if price_range:
            l.add_value('price_range', ldjson['priceRange'])

        l.add_css('categories', '.category-str-list a::text', set)

        map_json = safe_get(response, '.lightbox-map::attr(data-map-state)')
        if map_json:
            try:
                map_data = json.loads(map_json)
                coords = map_data['markers']['starred_business']['location']
                l.add_value('latitude', coords['latitude'])
                l.add_value('longitude', coords['longitude'])
            except Exception:
                logging.exception("extracting location from:\n%s" % map_json)

        return l.load_item()
