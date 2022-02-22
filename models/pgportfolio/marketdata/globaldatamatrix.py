from __future__ import division
from __future__ import absolute_import
from __future__ import print_function

from models.pgportfolio.marketdata.coinlist import CoinList
import numpy as np
import pandas as pd
from models.pgportfolio.tools.data import panel_fillna
from models.pgportfolio.constants import *
import sqlite3
from datetime import datetime
import time
from tabulate import tabulate

from common.custom_logger2 import get_custom_logger, get_custom_training_logger

logger = get_custom_logger(__name__)
training_logger = get_custom_training_logger(__name__)


class HistoryManager:
  """

    Maintains the SQLite DB containing historical coin price and volume data.

    Maintains coinlist with the top N coins.
    Once the top coins are selected for a given period, get all the historical data for the period specified in the config
    from the data provider (poloniex etc.,) and save to SQLite, if only data doesn't already exist in the DB.

    Retrieves the global panel


    Main Methods:
        get_global_panel - returns a multi-index dataframe of features per coin/timestamp for top N coins according to config using data from DB
        select_coins - returns top N coins by volume over given start/end period
        update_data - between given start-end and for a given coin, fill in any gaps in data in the DB by fetching from data provider and saving

    """

  # if offline ,the coin_list could be None
  # NOTE: return of the sqlite results is a list of tuples, each tuple is a row
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
    with sqlite3.connect(DATABASE_DIR) as connection:
      cursor = connection.cursor()
      cursor.execute("CREATE TABLE IF NOT EXISTS History (date INTEGER,"
                     " coin varchar(20), high FLOAT, low FLOAT,"
                     " open FLOAT, close FLOAT, volume FLOAT, "
                     " quoteVolume FLOAT, weightedAverage FLOAT,"
                     "PRIMARY KEY (date, coin));")
      connection.commit()

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

    connection = sqlite3.connect(DATABASE_DIR)
    try:
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
            sql = ("SELECT date+300 AS date_norm, close FROM History WHERE"
                   " date_norm>={start} and date_norm<={end}"
                   ' and date_norm%{period}=0 and coin="{coin}"'.format(start=start, end=end, period=period, coin=coin))
          elif feature == "open":
            sql = ("SELECT date+{period} AS date_norm, open FROM History WHERE"
                   " date_norm>={start} and date_norm<={end}"
                   ' and date_norm%{period}=0 and coin="{coin}"'.format(start=start, end=end, period=period, coin=coin))
          elif feature == "volume":
            sql = ("SELECT date_norm, SUM(volume) as volume" + " FROM (SELECT date+{period}-(date%{period}) "
                   "AS date_norm, volume, coin FROM History)"
                   ' WHERE date_norm>={start} and date_norm<={end} and coin="{coin}"'
                   " GROUP BY date_norm".format(period=period, start=start, end=end, coin=coin))
          elif feature == "high":
            sql = ("SELECT date_norm, MAX(high) as high" + " FROM (SELECT date+{period}-(date%{period})"
                   " AS date_norm, high, coin FROM History)"
                   ' WHERE date_norm>={start} and date_norm<={end} and coin="{coin}"'
                   " GROUP BY date_norm".format(period=period, start=start, end=end, coin=coin))
          elif feature == "low":
            sql = ("SELECT date_norm, MIN(low) as low" + " FROM (SELECT date+{period}-(date%{period})"
                   " AS date_norm, low, coin FROM History)"
                   ' WHERE date_norm>={start} and date_norm<={end} and coin="{coin}"'
                   " GROUP BY date_norm".format(period=period, start=start, end=end, coin=coin))
          else:
            msg = "The feature %s is not supported" % feature
            logger.error(msg)
            raise ValueError(msg)
          serial_data = pd.read_sql_query(sql, con=connection, parse_dates=["date_norm"], index_col="date_norm")

          serial_data.index.rename("minor", inplace=True)
          df_temp = pd.DataFrame(serial_data)
          df_temp = df_temp.reset_index()  # move 'minor' to a column which was an index
          df_temp.insert(loc=0, column="major", value=coin)
          df_temp = df_temp.set_index(["major", "minor"])
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
    finally:
      connection.commit()
      connection.close()
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
      connection = sqlite3.connect(DATABASE_DIR)
      try:
        cursor = connection.cursor()
        cursor.execute(
            "SELECT coin,SUM(volume) AS total_volume, max(date) FROM History WHERE"
            " date>=? and date<=? "
            " GROUP BY coin"
            " ORDER BY total_volume DESC "
            " LIMIT ?;",
            (int(start), int(end), self._coin_number),
        )
        coins_tuples = cursor.fetchall()

        if len(coins_tuples) != self._coin_number:
          logger.error("An sqlite error happend")
      finally:
        connection.commit()
        connection.close()
      coins = []
      for tuple in coins_tuples:
        coins.append(tuple[0])
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

        Raises:
            Exception: SQLite exception
        """
    connection = sqlite3.connect(DATABASE_DIR)
    logger.info("update_data: processing coin: " + coin)
    try:
      cursor = connection.cursor()
      min_date = cursor.execute("SELECT MIN(date) FROM History WHERE coin=?;", (coin,)).fetchall()[0][0]
      max_date = cursor.execute("SELECT MAX(date) FROM History WHERE coin=?;", (coin,)).fetchall()[0][0]

      if min_date == None or max_date == None:
        self.__fill_data(start, end, coin, cursor)
      else:
        if max_date + 10 * self.__storage_period < end:

          # removed this part as still want to train even if data right up to end
          # if not self._online:
          #   logger.error(
          #       f"Issue with end date selected. Have to be online. end: {end}, max_date:{max_date}, storage_period:{self.__storage_period}, max_date+10*self.__storage_period: {max_date+10*self.__storage_period}"
          #   )
          #   raise Exception("Have to be online")
          if self._online:
            self.__fill_data(max_date + self.__storage_period, end, coin, cursor)
        if min_date > start and self._online:
          self.__fill_data(start, min_date - self.__storage_period - 1, coin, cursor)

      # if there is no data
    finally:
      connection.commit()
      connection.close()

  def __fill_data(self, start, end, coin, cursor):
    duration = 7819200  # three months
    bk_start = start
    for bk_end in range(start + duration - 1, end, duration):
      self.__fill_part_data(bk_start, bk_end, coin, cursor)
      bk_start += duration
    if bk_start < end:
      self.__fill_part_data(bk_start, end, coin, cursor)

  def __fill_part_data(self, start, end, coin, cursor):
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
          cursor.execute(
              "INSERT INTO History VALUES (?,?,?,?,?,?,?,?,?)",
              (
                  c["date"],
                  coin,
                  1.0 / c["low"],
                  1.0 / c["high"],
                  1.0 / c["open"],
                  1.0 / c["close"],
                  c["quoteVolume"],
                  c["volume"],
                  1.0 / weightedAverage,
              ),
          )
        else:
          cursor.execute(
              "INSERT INTO History VALUES (?,?,?,?,?,?,?,?,?)",
              (c["date"], coin, c["high"], c["low"], c["open"], c["close"], c["volume"], c["quoteVolume"], weightedAverage),
          )
