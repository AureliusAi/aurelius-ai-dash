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
from common.db import SqliteDataDB
tz = pytz.timezone('Asia/Tokyo')

from models.pgportfolio.tools.configprocess import preprocess_config

training_pages = Blueprint("training", __name__)


def set_up_logging():
  """
    
    Configures logging for training related processes

  """
  # create the log file
  tk_now = datetime.now(tz)
  #log_file_name = f'training_log_{tk_now.strftime("%Y%m%d_%H%M%S")}.log'
  log_file_name = f'training_log.log'
  log_path = os.path.join('models','logs',log_file_name)
  if not os.path.exists(os.path.join('models','logs')):
    os.makedirs("models/logs")
  if os.path.exists(log_path):
    os.remove(log_path)

  # create the Log handlers. 1 for STDOUT and 1 for output to a file
  file_handler = logging.FileHandler(filename=f'./models/logs/{log_file_name}')
  stdout_handler = logging.StreamHandler(sys.stdout)
  handlers = [file_handler, stdout_handler]

  logging.basicConfig(level=logging.INFO, 
    format='[%(asctime)s] {%(filename)s:%(lineno)d} %(levelname)s - %(message)s',
    handlers=handlers)

@training_pages.post("/api/training/check-and-retrieve-hist-data")
def check_and_download_historical_data():
  """

  Gets historical data given start/end dates and all the overrides 
  to the DataMatricies constructor

  Returns:
      JSON: object describing the status and result of the operation
  """

  from models.pgportfolio.marketdata.datamatrices import DataMatrices
  
  set_up_logging()

  logging.info("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
  logging.info("@training_pages.post(/api/training/check-and-retrieve-hist-data)")
  logging.info("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")

  startstr:str = request.json['starttrainingdate']
  endstr:str = request.json['endtrainingdate']
  coin_num_str:str = request.json['coinnum']
  period:str = request.json['globalperiod']
  window_size:str = request.json['windowsize']
  volume_average_days:str = request.json['volumeaveragedays']
  feature_number:str = request.json['numberfeatures']
  data_provider:str = request.json['dataprovider']
  test_portion:str = request.json['testportion']

  coin_num = int(coin_num_str)
  startdate_dt = dateutil.parser.isoparse(startstr)
  start = int(time.mktime(startdate_dt.timetuple()))
  enddate_dt = dateutil.parser.isoparse(endstr)
  end = int(time.mktime(enddate_dt.timetuple()))
  period = int(period)
  volume_average_days = int(volume_average_days)
  feature_number = int(feature_number)
  window_size = int(window_size)
  test_portion = float(test_portion) / 100.
  
  # get net_config.json to use as a base
  with open("models/pgportfolio/net_config.json") as file:
    config = json.load(file)

  config = preprocess_config(config)

  logging.info(f'start date: {start}')
  logging.info(f'end date: {end}')
  DataMatrices(start=start,
                end=end,
                feature_number=feature_number,
                online=True,
                period=period,
                volume_average_days=volume_average_days,
                coin_filter=coin_num,
                is_permed=config["input"]["is_permed"],
                test_portion=test_portion,
                portion_reversed=config["input"]["portion_reversed"],
                data_provider=data_provider)

  return { "status_msg": f"Successfully downloaded historic data from {startstr} to {endstr}", "status_code": "OK"}


@training_pages.post("/api/training/get-historical-data")
def download_historical_data():
  """

  Downloads historical data from the data provider and stores in the DB

  Returns:
      JSON: object describing the status and result of the operation
  """

  from models.pgportfolio.marketdata.datamatrices import DataMatrices
  
  set_up_logging()

  logging.info("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
  logging.info("@training_pages.post(/api/training/get-historical-data)")
  logging.info("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
  
  with open("models/pgportfolio/net_config.json") as file:
      config = json.load(file)

  config = preprocess_config(config)

  startstr:str = request.json['starttrainingdate']
  endstr:str = request.json['endtrainingdate']
  coin_num_str:str = request.json['coinnum']
  data_provider:str = request.json['dataprovider']

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
                portion_reversed=config["input"]["portion_reversed"],
                data_provider=data_provider)

  return { "status_msg": f"Successfully downloaded historic data from {startstr} to {endstr}", "status_code": "OK"}


@training_pages.post("/api/training/train-one-shot")
def train_one_shot():
  """ Performs a one-shot training operation

  Returns:
      object: status information  and resultsregarding the performed operation
  """

  import models.pgportfolio.autotrain.training
  import models.pgportfolio.autotrain.generate as generate

  set_up_logging()

  logging.info("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
  logging.info("@training_pages.post(/api/training/train-one-shot)")
  logging.info("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
    
  # open the base config for training which contains default values and prepopulate any missing values
  with open("models/pgportfolio/net_config.json") as file:
      config = json.load(file)
  config = preprocess_config(config)

  # get inputs from UI and overwrite config values with input values from UI
  startstr:str = request.json['starttrainingdate']
  endstr:str = request.json['endtrainingdate']
  coin_num_str:str = request.json['coinnum']
  num_processes:int = int(request.json['numprocesses'])
  deleteExistingRuns:bool = bool(request.json['numprocesses'])
  device:str = request.json['device']
  device = device.lower()
  numberepochs:str = request.json['numberepochs']
  globalperiod:str = request.json['globalperiod']
  windowsize:str = request.json['windowsize']
  volumeaveragedays:str = request.json['volumeaveragedays']
  testportion:str = request.json['testportion']
  numberfeatures:str = request.json['numberfeatures']
  dataprovider:str = request.json['dataprovider']
  nn: str = request.json['nn']

  # update config with overrides from UI
  if coin_num_str:
    config["input"]["coin_number"] = int(coin_num_str)
  
  if startstr:
    config["input"]["start_date"] = startstr

  if endstr:
    config["input"]["end_date"] = endstr

  if numberepochs:
    config["training"]["steps"] = int(numberepochs)

  if globalperiod != '':
    config["input"]["global_period"] = int(globalperiod)

  if windowsize != '':
    config["input"]["window_size"] = int(windowsize)

  if volumeaveragedays != '':
    config["input"]["volume_average_days"] = int(volumeaveragedays)

  if testportion != '':
    config["input"]["test_portion"] = float(testportion)

  if numberfeatures != '':
    config["input"]["feature_number"] = int(numberfeatures)

  if dataprovider != '':
    config["input"]["data_provider"] = dataprovider

  # insert the definition of the Neural network config  
  db = SqliteDataDB()
  qry = f"""
    select `Definition` 
    from Config_NN main
    inner join (
      select `Name` as mName, max(`Version`) as mVersion, max(`UpdateDate`) as mUpdateDate, isDeleted as maxIsDeleted from Config_NN
      Group by `Name`
    ) maxv on main.Name = maxv.mName and main.Version = maxv.mVersion and  main.UpdateDate = maxv.mUpdateDate
    Where maxIsDeleted = 0
    and `Name` = '{nn}'
    Order by `UpdateDate` desc
  """
  df, error_msg = db.qry_read_data(qry)
  if df is None:
    return { "status_msg": error_msg, "status_code": -1}

  config['layers'] = df['Definition'].values[0]
  
  logging.info("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
  logging.info("Training input Parameters")
  logging.info("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
  logging.info(json.dumps(config, indent=4, sort_keys=True))
  logging.info("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")


  # first delete existing training folders (if deleteExistingRuns=True), generate and then run training
  repeat_option = 1 # TODO: move to UI/config. figure out what to do with it
  generate.add_packages(config, int(repeat_option), deleteExistingRuns)

  # # if not options.algo:
  # num_processes = config["input"]
  status_code, status_msg = models.pgportfolio.autotrain.training.train_all(config, num_processes, device)
  # # else:
  # #     for folder in options.folder:
  # #         raise NotImplementedError()

  return { "status_msg": status_msg, "status_code": status_code}
