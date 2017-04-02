import json
import logging

from scrapy.spider import Spider, Request

from yelpspider.items import YelpspiderItem


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
        item = YelpspiderItem()
        item['url'] = response.url
        safe_set(item, 'name', response,
                 '.biz-page-title::text')
        safe_set(item, 'category', response,
                 '.category-str-list a::text')

        item['rating'] = ''
        rating = safe_get(response,
                          '.biz-rating img::attr(alt)')
        if rating:
            try:
                item['rating'] = float(rating.split()[0])
            except Exception:
                logging.exception("extracting rating from '%s'" % rating)

        item['price_range'] = ''
        price_range = safe_get(response,
                               '.business-attribute.price-range::text')

        if price_range:
            try:
                item['price_range'] = price_range.count('$')
            except Exception:
                logging.exception("extracting price range from '%s'"
                                  % price_range)

        item['latitude'] = item['longitude'] = ''
        map_json = safe_get(response, '.lightbox-map::attr(data-map-state)')
        if map_json:
            try:
                map_data = json.loads(map_json)
                coords = map_data['markers']['starred_business']['location']
                item['latitude'] = coords['latitude']
                item['longitude'] = coords['longitude']
            except Exception:
                logging.exception("extracting location from:\n%s" % map_json)

        return item
