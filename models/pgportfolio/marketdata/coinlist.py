from __future__ import absolute_import
from __future__ import print_function
from __future__ import division
from models.pgportfolio.marketdata.poloniex import Poloniex
from models.pgportfolio.tools.data import get_chart_until_success
import pandas as pd
from datetime import datetime
import logging
from models.pgportfolio.constants import *


class CoinList(object):
    """

    This class maintains list of coins/volumnes/prices from provider.
    From this we can get list of top N coins by volume for the given date range (from volume f)

    in the __init__ method it gets list of market volumn and ticker information from provider and then extraces relavent data and stores in lists

    Args:
        object ([type]): [description]
    """
    def __init__(self, end, volume_average_days=1, volume_forward=0):
        self._polo = Poloniex()
        # connect the internet to accees volumes
        vol = self._polo.marketVolume()
        ticker = self._polo.marketTicker()
        pairs = []
        coins = []
        volumes = []
        prices = []

        logging.info('Selecting the Coin Data to get top N coins')
        logging.info("select coin online from %s to %s" % (datetime.fromtimestamp(end-(DAY*volume_average_days)-
                                                                                  volume_forward).
                                                           strftime('%Y-%m-%d %H:%M'),
                                                           datetime.fromtimestamp(end-volume_forward).
                                                           strftime('%Y-%m-%d %H:%M')))
        for k, v in vol.items():
            if k.startswith("BTC_") or k.endswith("_BTC"):
                pairs.append(k)
                logging.info(f'Getting volumn/price data for: {k}')
                last_price:float = 0
                volume: int = 0
                for c, val in v.items():
                    if c != 'BTC':
                        if k.endswith('_BTC'):
                            coins.append('reversed_' + c)
                            last_price = 1.0 / float(ticker[k]['last'])
                            prices.append(last_price)
                        else:
                            coins.append(c)
                            last_price = float(ticker[k]['last'])
                            prices.append(last_price)
                    else:
                        volume:int = self.__get_total_volume(pair=k, global_end=end,
                                                               days=volume_average_days,
                                                               forward=volume_forward)
                        volumes.append(volume)
                    logging.info(f"    coin: {c}, pair: {k}, vol: {volume}, price: {last_price}")

        self._df = pd.DataFrame({'coin': coins, 'pair': pairs, 'volume': volumes, 'price':prices})
        
        self._df = self._df.set_index('coin')
        logging.info('____________ COINLIST - Result ___________')
        logging.info(self._df.head(10))

    @property
    def allActiveCoins(self):
        return self._df

    @property
    def allCoins(self):
        return self._polo.marketStatus().keys()

    @property
    def polo(self):
        return self._polo

    def get_chart_until_success(self, pair, start, period, end):
        return get_chart_until_success(self._polo, pair, start, period, end)

    # get several days volume
    def __get_total_volume(self, pair, global_end, days, forward):
        start = global_end-(DAY*days)-forward
        end = global_end-forward
        chart = self.get_chart_until_success(pair=pair, period=DAY, start=start, end=end)
        result = 0
        for one_day in chart:
            if pair.startswith("BTC_"):
                result += one_day['volume']
            else:
                result += one_day["quoteVolume"]
        return result


    def topNVolume(self, n=5, order=True, minVolume=0):
        if minVolume == 0:
            r = self._df.loc[self._df['price'] > 2e-6]
            r = r.sort_values(by='volume', ascending=False)[:n]
            logging.info('::::::: top N coins are:::::::: ')
            logging.info(r)
            if order:
                return r
            else:
                return r.sort_index()
        else:
            return self._df[self._df.volume >= minVolume]
