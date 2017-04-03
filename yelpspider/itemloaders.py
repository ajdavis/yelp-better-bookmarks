from scrapy.loader import ItemLoader
from scrapy.loader.processors import TakeFirst, Identity

from yelpspider.items import YelpspiderItem


class YelpspiderItemLoader(ItemLoader):
    default_item_class = YelpspiderItem
    default_output_processor = TakeFirst()
    categories_out = Identity()
