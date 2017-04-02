# Define here the models for your scraped items
#
# See documentation in:
# http://doc.scrapy.org/en/latest/topics/items.html

from scrapy.item import Field, Item


class YelpspiderItem(Item):
    name = Field()
    url = Field()
    category = Field()
    rating = Field()
    price_range = Field()
    latitude = Field()
    longitude = Field()
