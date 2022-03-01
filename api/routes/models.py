import json
import time
from datetime import datetime

import dateutil.parser
from common.custom_logger2 import (get_custom_logger, get_custom_training_logger, global_training_queue)
from flask import Blueprint, jsonify, make_response, redirect, request, url_for

from models.pgportfolio.resultprocess.plot import plot_backtest_using_trained_model, load_from_saved_instance

logger = get_custom_logger(__name__)
training_logger = get_custom_training_logger(__name__)

from common.db import SqliteDataDB

model_pages = Blueprint("models", __name__)


@model_pages.post("/api/models/update-key-label")
def update_key_label():
  """given an existing key and a label, update the label of the key

  Returns:
      dict: return dictionary with update_label_error set or not
  """

  key: str = request.json['key']
  label: str = request.json['label']

  db = SqliteDataDB()
  qry = f"""
    update Training_Results 
    set label = '{label}'
    where `key` = '{key}'
  """
  print(f'updating model label: {qry}')
  updated_rows, is_error, error_msg = db.update_or_delete_data(qry)

  res = dict()
  res['is_error'] = is_error
  res['error_msg'] = error_msg
  res['updated_rows'] = updated_rows
  return res


@model_pages.post("/api/models/plot-results")
def plot_trained_model():
  """
    Given a key of the trained model plot the result over the tested period
  """

  key: str = request.json['key']
  algos: list = request.json['algos']

  logger.info("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
  logger.info("Calling: @model_pages.post(/api/config/models/plot)")
  logger.info("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")

  labels: list = [key]
  labels += algos
  history, config = load_from_saved_instance(key)
  chart_data: dict = plot_backtest_using_trained_model(config, history, algos, labels)

  res = dict()
  res['chartData'] = json.dumps(chart_data, default=str)

  return res


@model_pages.get("/api/models/get-all")
def get_all_nn_instances():
  db = SqliteDataDB()
  qry = f"""
    select 
      `key`, 
      label,
      test_pv,
      test_log_mean,
      test_log_mean_free,
      backtest_test_pv,
      backtest_test_log_mean,
      input_start_date,
      input_end_date,
      input_coin_number,
      input_global_period,
      input_feature_number,
      training_num_epochs,
      training_nn_agent_name,
      input_data_provider,
      input_window_size,
      input_test_portion,
      training_learning_rate,
      training_fast_train,
      training_time,
      stored_path,
      config
    from Training_Results main
    Order by `key` desc
  """
  print(f'get all Model instances: {qry}')
  df, error_msg = db.qry_read_data(qry)
  if df is None:
    res = dict()
    res['models'] = []
    res['error_msg'] = error_msg
    return res

  res = dict()
  res['models'] = df.to_json(orient="records")

  return res
