from datetime import datetime, timezone, timedelta

from models.pgportfolio.marketdata.datamatrices import DataMatrices
from models.pgportfolio.tools.configprocess import preprocess_config


def downloadHistoricData(startdtstr: str,
                         enddtstr: str,
                         data_provider: str,
                         coinnum: int,
                         featurenum: int,
                         windowsize: int,
                         globalperiod: str,
                         volume_avg_days: int,
                         test_portion: float,
                         online: bool = True,
                         is_permed: bool = False,
                         position_reversed: bool = False):
  """Downloads historic data from the given data provider

  Args:
      startdate (str): start date to download data from
      enddate (str): end date to download data from
      coinnum (int): number of coins to download data for
      featurenum (int): number of features to download data for
      windowsize (int): The number of periods per window (e.g. if period is 30min and window size is 10 then total time of one unit of training will be 300min)
      globalperiod (str): the period of the klines to download data for 
      volume_avg_days (int): the number of days to take average of before starting training to determine which coins to use
      test_portion (float): The fraction of training data to use as training and the rest for validation
      online (bool, optional): the mode to get data for. To get latest data needs to be online. Defaults to True.
      is_permed (bool, optional): Used when extracting sample from Replay buffer. If True then only returns samples in order and not randomly. Defaults to False.
      position_reversed (bool, optional): sets whether we want to process data in reverse. Defaults to False.
  """

  # convert start/end to unix timestamps
  startdtstr = startdtstr.replace('-', '')
  enddtstr = enddtstr.replace('-', '')

  start_dt = datetime.strptime(startdtstr, '%Y%m%d')
  end_dt = datetime.strptime(enddtstr, '%Y%m%d')
  end_dt = end_dt + timedelta(days=1)

  start = start_dt.replace(tzinfo=timezone.utc).timestamp()
  end = end_dt.replace(tzinfo=timezone.utc).timestamp()

  start = int(start)
  end = int(end)

  start_of_test: int = round(int((end - start) / int(globalperiod)) * (1 - test_portion)) * int(globalperiod) + start
  end_of_test: int = round(int((end - start) / int(globalperiod))) * int(globalperiod) + start

  start_of_test_str = datetime.utcfromtimestamp(start_of_test).strftime('%Y-%m-%d %H:%M:%S')
  end_of_test_str = datetime.utcfromtimestamp(end_of_test).strftime('%Y-%m-%d %H:%M:%S')

  DataMatrices(start=start,
               end=end,
               data_provider=data_provider,
               feature_number=featurenum,
               window_size=windowsize,
               online=online,
               period=globalperiod,
               volume_average_days=volume_avg_days,
               coin_filter=coinnum,
               is_permed=is_permed,
               test_portion=test_portion,
               portion_reversed=position_reversed)

  return start_of_test_str, end_of_test_str