from __future__ import absolute_import, print_function, division
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib import rc
import pandas as pd

import json
import numpy as np
import datetime
from common.db import SqliteDataDB
from models.pgportfolio.tools.indicator import max_drawdown, sharpe, positive_count, negative_count, moving_accumulate
from models.pgportfolio.tools.configprocess import parse_time, check_input_same
from models.pgportfolio.tools.shortcut import execute_backtest

from common.custom_logger2 import get_custom_logger, get_custom_training_logger
from common.custom_logger2 import global_training_queue

logger = get_custom_logger(__name__)
training_logger = get_custom_training_logger(__name__)

# the dictionary of name of indicators mapping to the function of related indicators
# input is portfolio changes
INDICATORS = {
    "portfolio value": np.prod,
    "sharpe ratio": sharpe,
    "max drawdown": max_drawdown,
    "positive periods": positive_count,
    "negative periods": negative_count,
    "postive day": lambda pcs: positive_count(moving_accumulate(pcs, 48)),
    "negative day": lambda pcs: negative_count(moving_accumulate(pcs, 48)),
    "postive week": lambda pcs: positive_count(moving_accumulate(pcs, 336)),
    "negative week": lambda pcs: negative_count(moving_accumulate(pcs, 336)),
    "average": np.mean
}

NAMES = {
    "best": "Best Stock (Benchmark)",
    "crp": "UCRP (Benchmark)",
    "ubah": "UBAH (Benchmark)",
    "anticor": "ANTICOR",
    "olmar": "OLMAR",
    "pamr": "PAMR",
    "cwmr": "CWMR",
    "rmr": "RMR",
    "ons": "ONS",
    "up": "UP",
    "eg": "EG",
    "bk": "BK",
    "corn": "CORN",
    "m0": "M0",
    "wmamr": "WMAMR"
}


def plot_backtest_using_trained_model(config, result_history, algos, labels=None):
  """
    @:param config: config dictionary
    @:param result_history: the history data from the trained model
    @:param algos: list of strings representing the name of algorithms or index of pgportfolio result (for the benchmarket)
    """
  results = []
  results.append(np.cumprod(result_history))

  for i, algo in enumerate(algos):
    logger.info("start executing " + algo)
    results.append(np.cumprod(execute_backtest(algo, config)))
    logger.info("finish executing " + algo)

  start, end = _extract_test(config)
  timestamps = np.linspace(start, end, len(results[0]))
  dates = [datetime.datetime.fromtimestamp(int(ts) - int(ts) % config["input"]["global_period"]) for ts in timestamps]

  weeks = mdates.WeekdayLocator()
  days = mdates.DayLocator()

  rc("font", **{"family": "sans-serif", "sans-serif": ["Helvetica"], "size": 8})
  """
    styles = [("-", None), ("--", None), ("", "+"), (":", None),
              ("", "o"), ("", "v"), ("", "*")]
    """
  pv_list = []
  fig, ax = plt.subplots()
  fig.set_size_inches(9, 5)
  for i, pvs in enumerate(results):
    if len(labels) > i:
      label = labels[i]
    else:
      label = NAMES[algos[i]]
    pv_list = pvs
    ax.semilogy(dates, pvs, linewidth=1, label=label)
    #ax.plot(dates, pvs, linewidth=1, label=label)

  plt.ylabel("portfolio value $p_t/p_0$", fontsize=12)
  plt.xlabel("date", fontsize=12)
  xfmt = mdates.DateFormatter("%Y-%m-%d %H:%M")
  ax.xaxis.set_major_locator(weeks)
  ax.xaxis.set_minor_locator(days)
  datemin = dates[0]
  datemax = dates[-1]
  ax.set_xlim(datemin, datemax)

  ax.xaxis.set_major_formatter(xfmt)
  plt.grid(True)
  plt.tight_layout()
  ax.legend(loc="upper left", prop={"size": 10})
  fig.autofmt_xdate()
  plt.savefig("result.eps", bbox_inches='tight', pad_inches=0)

  chart_data = dict()
  chart_data['YLabel'] = "portfolio value $p_t/p_0$"
  chart_data['XLabel'] = "Date"
  chart_data['XAxis'] = dates
  chart_data['XMax'] = datemax
  chart_data['XMin'] = datemin
  chart_data['Data'] = pv_list.tolist()
  chart_data['Labels'] = labels
  return chart_data


def plot_backtest(config, algos, labels=None):
  """
    @:param config: config dictionary
    @:param algos: list of strings representing the name of algorithms or index of pgportfolio result (for the benchmarket)
    """
  results = []
  for i, algo in enumerate(algos):
    if algo.isdigit():
      results.append(np.cumprod(_load_from_summary(algo, config)))
      logger.info("load index " + algo + " from csv file")
    else:
      logger.info("start executing " + algo)
      results.append(np.cumprod(execute_backtest(algo, config)))
      logger.info("finish executing " + algo)

  start, end = _extract_test(config)
  timestamps = np.linspace(start, end, len(results[0]))
  dates = [datetime.datetime.fromtimestamp(int(ts) - int(ts) % config["input"]["global_period"]) for ts in timestamps]

  weeks = mdates.WeekdayLocator()
  days = mdates.DayLocator()

  rc("font", **{"family": "sans-serif", "sans-serif": ["Helvetica"], "size": 8})
  """
    styles = [("-", None), ("--", None), ("", "+"), (":", None),
              ("", "o"), ("", "v"), ("", "*")]
    """
  fig, ax = plt.subplots()
  fig.set_size_inches(9, 5)
  for i, pvs in enumerate(results):
    if len(labels) > i:
      label = labels[i]
    else:
      label = NAMES[algos[i]]
    ax.semilogy(dates, pvs, linewidth=1, label=label)
    #ax.plot(dates, pvs, linewidth=1, label=label)

  plt.ylabel("portfolio value $p_t/p_0$", fontsize=12)
  plt.xlabel("time", fontsize=12)
  xfmt = mdates.DateFormatter("%m-%d %H:%M")
  ax.xaxis.set_major_locator(weeks)
  ax.xaxis.set_minor_locator(days)
  datemin = dates[0]
  datemax = dates[-1]
  ax.set_xlim(datemin, datemax)

  ax.xaxis.set_major_formatter(xfmt)
  plt.grid(True)
  plt.tight_layout()
  ax.legend(loc="upper left", prop={"size": 10})
  fig.autofmt_xdate()
  plt.savefig("result.eps", bbox_inches='tight', pad_inches=0)
  plt.show()


def table_backtest(config, algos, labels=None, format="raw", indicators=list(INDICATORS.keys())):
  """
    @:param config: config dictionary
    @:param algos: list of strings representing the name of algorithms
    or index of pgportfolio result
    @:param format: "raw", "html", "latex" or "csv". If it is "csv",
    the result will be save in a csv file. otherwise only print it out
    @:return: a string of html or latex code
    """
  results = []
  labels = list(labels)
  for i, algo in enumerate(algos):
    if algo.isdigit():
      portfolio_changes = _load_from_summary(algo, config)
      logger.info("load index " + algo + " from csv file")
    else:
      logger.info("start executing " + algo)
      portfolio_changes = execute_backtest(algo, config)
      logger.info("finish executing " + algo)

    indicator_result = {}
    for indicator in indicators:
      indicator_result[indicator] = INDICATORS[indicator](portfolio_changes)
    results.append(indicator_result)
    if len(labels) <= i:
      labels.append(NAMES[algo])

  dataframe = pd.DataFrame(results, index=labels)

  start, end = _extract_test(config)
  start = datetime.datetime.fromtimestamp(start - start % config["input"]["global_period"])
  end = datetime.datetime.fromtimestamp(end - end % config["input"]["global_period"])

  print("backtest start from " + str(start) + " to " + str(end))
  if format == "html":
    print(dataframe.to_html())
  elif format == "latex":
    print(dataframe.to_latex())
  elif format == "raw":
    print(dataframe.to_string())
  elif format == "csv":
    dataframe.to_csv("./compare" + end.strftime("%Y-%m-%d") + ".csv")
  else:
    raise ValueError("The format " + format + " is not supported")


def _extract_test(config):
  global_start = parse_time(config["input"]["start_date"])
  global_end = parse_time(config["input"]["end_date"])
  span = global_end - global_start
  start = global_end - config["input"]["test_portion"] * span
  end = global_end
  return start, end


def _load_from_summary(index, config):
  """ load the backtest result form train_package/train_summary
    @:param index: index of the training and backtest
    @:return: numpy array of the portfolio changes
    """
  df = pd.read_csv("./train_package/train_summary.csv")
  print(df.head())
  history_string = df.loc[int(index)]["backtest_test_history"]
  if not check_input_same(config, json.loads(df.loc[int(index)]["config"])):
    raise ValueError("the date of this index is not the same as the default config")
  return np.fromstring(history_string, sep=",")[:-1]


def load_from_saved_instance(key):
  """ load the backtest result from saved_models/key
    @:param index: index of the training and backtest
    @:return: numpy array of the portfolio changes
    """

  db = SqliteDataDB()
  qry = f"""
    select 
      `key`, 
      config,
      backtest_test_history
    from Training_Results
    Where `key` = '{key}'
  """
  print(qry)
  df, error_msg = db.qry_read_data(qry)

  history_string = df.loc[df['key'] == key, "backtest_test_history"].values[0]
  config = df.loc[df['key'] == key, "config"].values[0]
  return np.fromstring(history_string, sep=",")[:-1], json.loads(config)
