from __future__ import division
from __future__ import absolute_import
from __future__ import print_function

from common.db import MariaDB

from models.pgportfolio.marketdata.coinlist import CoinList
import numpy as np
import pandas as pd
from models.pgportfolio.tools.data import panel_fillna
from models.pgportfolio.constants import *
from datetime import datetime
import time
from tabulate import tabulate

from common.custom_logger2 import get_custom_logger, get_custom_training_logger

logger = get_custom_logger(__name__)
training_logger = get_custom_training_logger(__name__)


class HistoryManager:
  """

    Maintains the Maria DB containing historical coin price and volume data.

    Maintains coinlist with the top N coins.
    Once the top coins are selected for a given period, get all the historical data for the period specified in the config
    from the data provider (poloniex etc.,) and save to MariaDB, if only data doesn't already exist in the DB.

    Retrieves the global panel


    Main Methods:
        get_global_panel - returns a multi-index dataframe of features per coin/timestamp for top N coins according to config using data from DB
        select_coins - returns top N coins by volume over given start/end period
        update_data - between given start-end and for a given coin, fill in any gaps in data in the DB by fetching from data provider and saving

    """

  # if offline ,the coin_list could be None
  # NOTE: return of the mariadb results is a list of tuples, each tuple is a row
  def __init__(self, coin_number, end, volume_average_days=1, volume_forward=0, online=True):
    self.initialize_db()
    self.__storage_period = FIVE_MINUTES  # keep this as 300
    self._coin_number = coin_number
    self._online = online
    if self._online:
      self._coin_list = CoinList(end, volume_average_days, volume_forward)
    self.__volume_forward = volume_forward
    self.__volume_average_days = volume_average_days
    self.__coins = None

  @property
  def coins(self):
    return self.__coins

  def initialize_db(self):
    create_table_if_not_exists_qry = f"""
      CREATE TABLE IF NOT EXISTS `Mkt_History_Px` (
      `date` int(10) unsigned NOT NULL,
      `coin` varchar(20) NOT NULL,
      `high` float DEFAULT NULL,
      `low` float DEFAULT NULL,
      `open` float DEFAULT NULL,
      `close` float DEFAULT NULL,
      `volume` float DEFAULT NULL,
      `quoteVolume` float DEFAULT NULL,
      `weightedAverage` float DEFAULT NULL,
      PRIMARY KEY (`date`,`coin`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """

    db = MariaDB()
    db.update_or_delete_data(create_table_if_not_exists_qry)

  def get_global_data_matrix(self, start, end, period=300, features=("close",)):
    """
        :return a numpy ndarray whose axis is [feature, coin, time]
        """
    return self.get_global_panel(start, end, period, features).values

  def get_global_panel(self, start: int, end: int, period: int = 300, features: tuple = ("close",)) -> pd.DataFrame:
    """
        Given the start/end periods and list of features, creates and returns a multi index data frame of the following strutures

                                   | Feature 1 | Feature 2 | ... |
        COIN |      TIME STAMP     |           |           |     |
        -----+---------------------+-----------+-----------+-----|
        LTC  | 2016-10-01 09:00:00 | 170.98    | 169.56    | ... |

        First it gets a list of coins with greatest volume for given start/end period
        It also calls update_data to fill in all the historic data between start and end

        :param start/end: linux timestamp in seconds
        :param period: time interval of each data access point
        :param features: tuple or list of the feature names
        :return a panel, [feature, coin, time]
        """
    start = int(start - (start % period))
    end = int(end - (end % period))
    coins = self.select_coins(start=end - self.__volume_forward - self.__volume_average_days * DAY, end=end - self.__volume_forward)
    self.__coins = coins
    for coin in coins:
      self.update_data(start, end, coin)
    if len(coins) != self._coin_number:
      raise ValueError("the length of selected coins %d is not equal to expected %d" % (len(coins), self._coin_number))

    logger.info("feature type list is %s" % str(features))
    training_logger.info("feature type list is %s" % str(features))
    self.__checkperiod(period)

    # Index is multi-index per instrument / per date time
    # First (major) layer is instrument
    # Second (minor) layer is date time
    # The columns are the features (close, high, low etc.,)
    time_index = pd.to_datetime(list(range(start, end + 1, period)), unit="s")
    multi_index = pd.MultiIndex.from_product([coins, time_index], names=["major", "minor"])
    panel = pd.DataFrame(dtype=np.float32, index=multi_index, columns=features)

    logger.info(f"coins: {coins}")
    logger.info(f"time index: {time_index}")
    logger.info(f"multi index: {multi_index}")
    logger.info(f"type(time_index): {type(time_index)}")
    logger.info(f"type(multi_index): {type(multi_index)}")
    logger.info(f"features: {features}")
    logger.info(f"-----------------------------------------------------------")
    logger.info(f"panel.head(): {panel.head()}")
    logger.info(f"panel.index: {panel.index}")
    logger.info(f"panel.dtypes: {panel.dtypes}")
    logger.info(f"-----------------------------------------------------------")

    db = MariaDB()

    for row_number, coin in enumerate(coins):
      logger.info("**********************************************************************")
      process_line = ('*' * 20)
      process_line += ' ' + f'Processing {coin}'.ljust(29)
      process_line += ('*' * 20)
      logger.info(process_line)
      logger.info("**********************************************************************")
      training_logger.info('Processng historic data for: ' + coin)
      start_timeit = time.time()
      for feature in features:
        # NOTE: transform the start date to end date
        if feature == "close":
          sql = f"""
                  SELECT (`date`+300) AS date_norm, close FROM Mkt_History_Px WHERE
                  (`date`+300)>={start} and (date+300)<={end}
                  and MOD((`date`+300),{period})=0  and coin='{coin}'
                """
        elif feature == "open":
          sql = f"""
                  SELECT (`date`+{period}) AS date_norm, open FROM Mkt_History_Px WHERE
                  (`date`+{period})>={start} and (date+{period})<={end}
                  and MOD(`date`+{period}),{period})=0 and coin='{coin}'
                """
        elif feature == "volume":
          sql = f"""
                  SELECT xx.date_norm, SUM(x.volume) as volume 
                  FROM (
                      SELECT (`date`+{period})-MOD(`date`,  {period}) AS date_norm, volume, coin 
                      FROM HisMkt_History_Pxtory
                  ) xx
                  WHERE xx.date_norm>={start} 
                  and xx.date_norm<={end} and xx.coin='{coin}'
                  GROUP BY xx.date_norm
                """
        elif feature == "high":
          sql = f"""
                    SELECT xx.date_norm, MAX(xx.high) as high 
                    FROM (
                        SELECT (`date`+{period})-MOD(`date`,{period}) AS date_norm, high, coin 
                        FROM Mkt_History_Px
                    ) xx
                    WHERE xx.date_norm>={start} and xx.date_norm<={end} and xx.coin='{coin}'
                    GROUP BY xx.date_norm
                """
        elif feature == "low":
          sql = f"""
                    SELECT xx.date_norm, MIN(xx.low) as low FROM 
                    (
                      SELECT (`date`+{period})-MOD(`date`,{period}) AS date_norm, low, coin 
                      FROM Mkt_History_Px
                    ) xx
                    WHERE xx.date_norm>={start} and xx.date_norm<={end} and xx.coin='{coin}'
                    GROUP BY xx.date_norm
                """
        else:
          msg = "The feature %s is not supported" % feature
          logger.error(msg)
          raise ValueError(msg)
        # print(sql)
        serial_data = db.qry_read_data(sql)
        # print(type(serial_data))
        # print(serial_data.dtypes)

        # print(serial_data.head())
        serial_data['date_norm'] = pd.to_datetime(serial_data['date_norm'], unit='s')
        # print(serial_data.head())
        serial_data = serial_data.set_index('date_norm')
        # print(serial_data.head())
        serial_data.index.rename("minor", inplace=True)
        # print(serial_data.head())
        df_temp = pd.DataFrame(serial_data)
        # print(df_temp.head())
        df_temp = df_temp.reset_index()  # move 'minor' to a column which was an index
        # print(df_temp.head())

        df_temp.insert(loc=0, column="major", value=coin)
        # print(df_temp.head())
        df_temp = df_temp.set_index(["major", "minor"])
        # print(df_temp.head())
        # print(tabulate(df_temp.head(10), headers='keys', tablefmt='psql'))
        # print(len(df_temp))
        # print(tabulate(panel.loc[(coin, slice(None)), [feature]].head(10), headers='keys', tablefmt='psql'))
        # print(len(panel.loc[(coin, slice(None)), [feature]]))

        panel_section = panel.loc[(coin, slice(None)), [feature]].copy()
        # print(tabulate(panel_section.head(10), headers='keys', tablefmt='psql'))
        # print(len(panel_section))
        panel_section.loc[(coin, slice(None)), [feature]] = df_temp[feature]
        # print(tabulate(panel_section.head(10), headers='keys', tablefmt='psql'))
        # print(len(panel_section))
        # we only want to fill_na on the subsection of the input matrix Xprint(tabulate(panel_section.head(10), headers='keys', tablefmt='psql'))
        panel_section = panel_fillna(panel_section, "both")
        # print(len(panel_section))
        panel.loc[(coin, slice(None)), [feature]] = panel_section

        print(tabulate(panel.query(f'major == "{coin}"').head(10), headers="keys", tablefmt="psql"))

        # print(panel.loc[(slice(None),'minor')>=1439010000, :].head(10))

        # print(panel.loc[("ETH", '2015-05-11 15:00:00'), :].head(10))
        # print(panel.head(10))

      end_timeit = time.time()
      logger.info(f">> [{coin}] took: {end_timeit - start_timeit} seconds")

    return panel

  def select_coins(self, start, end):
    """

        Queries DB to get top N coins (self._coin_number) by volume for the period (start - end) specified

        Args:
            start (int (unix timestamp)): the start timestamp
            end (int (unix timestamp)): the end timestamp

        Returns:
            list: list of top self._coin_number coins
        """
    if not self._online:
      logger.info("select coins offline from %s to %s" %
                  (datetime.fromtimestamp(start).strftime("%Y-%m-%d %H:%M"), datetime.fromtimestamp(end).strftime("%Y-%m-%d %H:%M")))

      db = MariaDB()

      select_coin_qry = f"""
          SELECT coin,SUM(volume) AS total_volume, max(date) FROM Mkt_History_Px WHERE
            date>={int(start)} and date<={int(end)} 
            GROUP BY coin
            ORDER BY total_volume DESC 
            LIMIT {self._coin_number};
      """
      # print(select_coin_qry)
      coin_df = db.qry_read_data(select_coin_qry)

      if len(coin_df) != self._coin_number:
        logger.error("An SQL error happend")

      coins = coin_df['coin'].tolist()
    else:
      coins = list(self._coin_list.topNVolume(n=self._coin_number).index)
    logger.info('*' * 70)
    logger.info('* Actual Selected Coins: ' + str(coins))
    logger.info(
        f'* start date: {datetime.fromtimestamp(start).strftime("%Y-%m-%d %H:%M:%S")}, end date: {datetime.fromtimestamp(end).strftime("%Y-%m-%d %H:%M:%S")}, coin num: {self._coin_number}'
    )
    logger.info('*' * 70)

    return coins

  def __checkperiod(self, period):
    if period == FIVE_MINUTES:
      return
    elif period == FIFTEEN_MINUTES:
      return
    elif period == HALF_HOUR:
      return
    elif period == TWO_HOUR:
      return
    elif period == FOUR_HOUR:
      return
    elif period == DAY:
      return
    else:
      raise ValueError("period has to be 5min, 15min, 30min, 2hr, 4hr, or a day")

  # add new history data into the database
  def update_data(self, start: int, end: int, coin: str):
    """

        Given a Coin and start and end timestamp, fill in the missing data.

        Args:
            start (int): start time timestamp
            end (int): end time timestamp
            coin (str): the coin to update

        """
    db = MariaDB()
    logger.info("update_data: processing coin: " + coin)

    coin_min_max_dates_qry = f"""
      SELECT coin, MIN(date) as min_date, MAX(date) as max_date FROM Mkt_History_Px 
      WHERE coin = '{coin}'
    """
    coin_update_dt_df = db.qry_read_data(coin_min_max_dates_qry)
    min_date_list = list(coin_update_dt_df.loc[coin_update_dt_df['coin'] == coin, 'min_date'].values)
    max_date_list = list(coin_update_dt_df.loc[coin_update_dt_df['coin'] == coin, 'max_date'].values)

    # print(type(min_date_list))
    # print(min_date_list.get('min_date'))
    # print(min_date_list.values)
    # print(type(min_date_list.values))
    # print(list(min_date_list.values))
    # print(list(min_date_list.values)[0])

    if len(min_date_list) > 0:
      min_date = min_date_list[0]
    else:
      min_date = None

    if len(max_date_list) > 0:
      max_date = max_date_list[0]
    else:
      max_date = None

    if min_date == None or max_date == None:
      self.__fill_data(start, end, coin)
    else:
      if max_date + 10 * self.__storage_period < end:

        # removed this part as still want to train even if data right up to end
        # if not self._online:
        #   logger.error(
        #       f"Issue with end date selected. Have to be online. end: {end}, max_date:{max_date}, storage_period:{self.__storage_period}, max_date+10*self.__storage_period: {max_date+10*self.__storage_period}"
        #   )
        #   raise Exception("Have to be online")
        if self._online:
          self.__fill_data(max_date + self.__storage_period, end, coin)
      if min_date > start and self._online:
        self.__fill_data(start, min_date - self.__storage_period - 1, coin)

  def __fill_data(self, start, end, coin):
    duration = 7819200  # three months
    bk_start = start
    for bk_end in range(start + duration - 1, end, duration):
      self.__fill_part_data(bk_start, bk_end, coin)
      bk_start += duration
    if bk_start < end:
      self.__fill_part_data(bk_start, end, coin)

  def __fill_part_data(self, start, end, coin):
    db = MariaDB()
    chart = self._coin_list.get_chart_until_success(pair=self._coin_list.allActiveCoins.at[coin, "pair"], start=start, end=end, period=self.__storage_period)
    logger.info("fill %s data from %s to %s" %
                (coin, datetime.fromtimestamp(start).strftime("%Y-%m-%d %H:%M"), datetime.fromtimestamp(end).strftime("%Y-%m-%d %H:%M")))
    for c in chart:
      if c["date"] > 0:
        if c["weightedAverage"] == 0:
          weightedAverage = c["close"]
        else:
          weightedAverage = c["weightedAverage"]

        # NOTE here the USDT is in reversed order
        if "reversed_" in coin:
          input_list = []
          input_list.append((
              c["date"],
              coin,
              1.0 / c["low"],
              1.0 / c["high"],
              1.0 / c["open"],
              1.0 / c["close"],
              c["quoteVolume"],
              c["volume"],
              1.0 / weightedAverage,
          ))
          db.insert_list_data("INSERT INTO Mkt_History_Px VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)", input_list)

        else:
          input_list = []
          input_list.append((c["date"], coin, c["high"], c["low"], c["open"], c["close"], c["volume"], c["quoteVolume"], weightedAverage))
          db.insert_list_data("INSERT INTO Mkt_History_Px VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)", input_list)
