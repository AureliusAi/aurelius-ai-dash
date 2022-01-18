from flask import Blueprint, request, jsonify, make_response,url_for,redirect
from datetime import date, datetime
import dateutil.parser
import time
import logging
import json

from pgportfolio.tools.configprocess import preprocess_config

training_pages = Blueprint("training", __name__)


@training_pages.post("/api/training/train-one-shot")
def train_one_shot():
  """ Performs a one-shot training operation

  Returns:
      object: status information  and resultsregarding the performed operation
  """
  from pgportfolio.marketdata.datamatrices import DataMatrices
  logging.basicConfig(level=logging.INFO)
  
  with open("../models/pgportfolio/net_config.json") as file:
      config = json.load(file)

  config = preprocess_config(config)

  startstr:str = request.json['starttrainingdate']
  endstr:str = request.json['endtrainingdate']


  if startstr != '':
    startdate_dt = dateutil.parser.isoparse(startstr)
    start = int(time.mktime(startdate_dt.timetuple()))
  else:
    start = time.mktime(datetime.strptime(config["input"]["start_date"], "%Y/%m/%d").timetuple())


  if endstr != '':
    enddate_dt = dateutil.parser.isoparse(endstr)
    end = int(time.mktime(enddate_dt.timetuple()))
  else:
    end = time.mktime(datetime.strptime(config["input"]["end_date"], "%Y/%m/%d").timetuple())
  

  print(f'start date: {start}')
  print(f'end date: {end}')
  DataMatrices(start=start,
                end=end,
                feature_number=config["input"]["feature_number"],
                window_size=config["input"]["window_size"],
                online=True,
                period=config["input"]["global_period"],
                volume_average_days=config["input"]["volume_average_days"],
                coin_filter=config["input"]["coin_number"],
                is_permed=config["input"]["is_permed"],
                test_portion=config["input"]["test_portion"],
                portion_reversed=config["input"]["portion_reversed"])

  return { "status_msg": "OK!"}