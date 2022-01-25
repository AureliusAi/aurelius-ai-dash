import os
import sys
from flask import Blueprint, request, jsonify, make_response,url_for,redirect
from datetime import date, datetime
import dateutil.parser
import time
import logging
import json
from pathlib import Path

import pytz
tz = pytz.timezone('Asia/Tokyo')

from models.pgportfolio.tools.configprocess import preprocess_config

training_pages = Blueprint("training", __name__)


@training_pages.post("/api/training/get-historical-data")
def download_historical_data():
  """

  Downloads historical data from the data provider and stores in the DB

  Returns:
      JSON: object describing the status and result of the operation
  """

  from models.pgportfolio.marketdata.datamatrices import DataMatrices
  logging.basicConfig(level=logging.INFO)

  logging.info("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
  logging.info("@training_pages.post(/api/training/get-historical-data)")
  logging.info("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
  
  with open("models/pgportfolio/net_config.json") as file:
      config = json.load(file)

  config = preprocess_config(config)

  startstr:str = request.json['starttrainingdate']
  endstr:str = request.json['endtrainingdate']
  coin_num_str:str = request.json['coin_num']

  if coin_num_str == '':
    coin_num = config["input"]["coin_number"]
  else:
    coin_num = int(coin_num_str)


  if startstr != '':
    startdate_dt = dateutil.parser.isoparse(startstr)
    start = int(time.mktime(startdate_dt.timetuple()))
  else:
    start = time.mktime(datetime.strptime(config["input"]["start_date"], "%Y-%m-%d").timetuple())


  if endstr != '':
    enddate_dt = dateutil.parser.isoparse(endstr)
    end = int(time.mktime(enddate_dt.timetuple()))
  else:
    end = time.mktime(datetime.strptime(config["input"]["end_date"], "%Y-%m-%d").timetuple())
  

  logging.info(f'start date: {start}')
  logging.info(f'end date: {end}')
  DataMatrices(start=start,
                end=end,
                feature_number=config["input"]["feature_number"],
                window_size=config["input"]["window_size"],
                online=True,
                period=config["input"]["global_period"],
                volume_average_days=config["input"]["volume_average_days"],
                coin_filter=coin_num,
                is_permed=config["input"]["is_permed"],
                test_portion=config["input"]["test_portion"],
                portion_reversed=config["input"]["portion_reversed"])

  return { "status_msg": f"Successfully downloaded historic data from {startstr} to {endstr}", "status_code": "OK"}


@training_pages.post("/api/training/train-one-shot")
def train_one_shot():
  """ Performs a one-shot training operation

  Returns:
      object: status information  and resultsregarding the performed operation
  """

  import models.pgportfolio.autotrain.training
  import models.pgportfolio.autotrain.generate as generate

  tk_now = datetime.now(tz)
  # log_file_name = f'training_log_{tk_now.strftime("%Y-%m-%d_%H%M%S")}.log'
  log_file_name = 'training_log.log'
  log_path = os.path.join('models','logs',log_file_name)
  if os.path.exists(log_path):
    os.remove(log_path)
  if not os.path.exists(os.path.join('models','logs')):
    os.makedirs("models/logs")
    

  # log_file = Path(log_path)
  # log_file.touch(exist_ok=True)
  file_handler = logging.FileHandler(filename=f'./models/logs/{log_file_name}')
  stdout_handler = logging.StreamHandler(sys.stdout)
  handlers = [file_handler, stdout_handler]

  logging.basicConfig(level=logging.INFO, 
    format='[%(asctime)s] {%(filename)s:%(lineno)d} %(levelname)s - %(message)s',
    handlers=handlers)

  logging.info("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
  logging.info("@training_pages.post(/api/training/train-one-shot)")
  logging.info("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
    
  with open("models/pgportfolio/net_config.json") as file:
      config = json.load(file)

  config = preprocess_config(config)

  startstr:str = request.json['starttrainingdate']
  endstr:str = request.json['endtrainingdate']
  coin_num_str:str = request.json['coinnum']
  num_processes:int = int(request.json['numprocesses'])
  deleteExistingRuns:bool = bool(request.json['numprocesses'])
  device:str = request.json['device']
  device = device.lower()

  # update config with overrides from UI
  if coin_num_str != '':
    config["input"]["coin_number"] = int(coin_num_str)
  
  if startstr != '':
    config["input"]["start_date"] = startstr

  if endstr != '':
    config["input"]["end_date"] = endstr

  # first delete training folders, generate and then run training

  repeat_option = 1 # move to UI/config
  generate.add_packages(config, int(repeat_option), deleteExistingRuns)

  # # if not options.algo:
  # num_processes = config["input"]
  status_code, status_msg = models.pgportfolio.autotrain.training.train_all(config, num_processes, device)
  # # else:
  # #     for folder in options.folder:
  # #         raise NotImplementedError()

  return { "status_msg": status_msg, "status_code": status_code}
