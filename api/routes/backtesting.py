import json
import time
from datetime import datetime

import dateutil.parser
from common.custom_logger2 import (get_custom_logger, get_custom_training_logger, global_training_queue)
from flask import Blueprint, jsonify, make_response, redirect, request, url_for
from models.pgportfolio.tools.shortcut import ALGOS, execute_backtest

#from models.pgportfolio.resultprocess.plot import plot_backtest_using_trained_model, load_from_saved_instance

logger = get_custom_logger(__name__)

from common.db import MariaDB

backtesting_pages = Blueprint("backtesting", __name__)


@backtesting_pages.get("/api/backtesting/get-benchmark-algos")
def get_benchmark_algo_list():
  """ returns a list of algos which can be used for benchmarking in the system

  Returns:
      dict: return return dictionary with list of benchmark algos
  """

  algos: list = list(ALGOS.keys())

  res = dict()
  res['algo_list'] = algos
  return res


def config_for_trained_model(key: str):
  """ loads the config for a trained model given the key
    @:param index: index of the training and backtest
    @:return: config of the trained model
    """

  db = MariaDB()
  qry = f"""
    select 
      `key`, 
      config
    from Training_Results
    Where `key` = '{key}'
  """
  print(qry)
  df = db.qry_read_data(qry)
  config = df.loc[df['key'] == key, "config"].values[0]
  return json.loads(config)


# def set_logging_by_algo(console_level, file_level, algo, name):
#   """ sets the log for the specified algo

#     Args:
#         console_level ([type]): [description]
#         file_level ([type]): [description]
#         algo ([type]): [description]
#         name ([type]): [description]
#     """
#   if algo.isdigit():
#     logging.basicConfig(filename="./train_package/" + algo + "/" + name, level=file_level)
#     console = logging.StreamHandler()
#     console.setLevel(console_level)
#     logging.getLogger().addHandler(console)
#   else:
#     logging.basicConfig(level=console_level)


@backtesting_pages.post("/api/backtesting/run-backtest-for-date-range-with-model")
def run_backtest_for_date_range_with_model():
  """ deletes a trained model from the DB with a given key

  Returns:
      dict: return dictionary with error information
  """

  startdtstr: str = request.json['startdtstr']
  enddtstr: str = request.json['enddtstr']
  modeltouse: str = request.json['modeltouse']

  # get config for trained model and update the start/end dates to correspond to back testing dates
  config_trained_model = config_for_trained_model(modeltouse)
  config_trained_model["input"]["start_date"] = startdtstr
  config_trained_model["input"]["end_date"] = enddtstr
  config_trained_model["input"]["test_portion"] = 100.0

  # ===========================================================================
  # should we set a log per algo?
  # ===========================================================================
  # set_logging_by_algo(logging.DEBUG, logging.DEBUG, options.algo, "backtestlog")

  list_algos_to_run: list = list(ALGOS.keys())

  for algo in list_algos_to_run:
    print(f"executing: [Traditional] {algo}")
    test_pc_vector, error_msg = execute_backtest(algo=algo, config=config_trained_model, is_traditional=True)

  if test_pc_vector is not None:
    print(f"executing: [Trained] {modeltouse}")
    test_pc_vector, error_msg = execute_backtest(algo=algo, config=config_trained_model, is_traditional=False)

  is_error: bool = False if test_pc_vector == None else True
  error_msg: str = '' if error_msg == '' else error_msg

  res = dict()
  res['is_error'] = is_error
  res['error_msg'] = error_msg
  return res
