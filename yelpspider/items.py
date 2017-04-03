# Define here the models for your scraped items
#
# See documentation in:
# http://doc.scrapy.org/en/latest/topics/items.html

from scrapy.item import Field, Item


class YelpspiderItem(Item):
    biz_id = Field()
    name = Field()
    url = Field()
    categories = Field()
    rating = Field()
    price_range = Field()
    address = Field()
    latitude = Field()
    longitude = Field()
