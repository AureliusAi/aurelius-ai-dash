from flask import Blueprint, request, jsonify, make_response, url_for, redirect
from datetime import datetime
import dateutil.parser
import time
from common.custom_logger2 import get_custom_logger, get_custom_training_logger
from common.custom_logger2 import global_training_queue

logger = get_custom_logger(__name__)
training_logger = get_custom_training_logger(__name__)

from common.db import MariaDB

data_pages = Blueprint("data", __name__)


@data_pages.get("/api/data/get-min-max-data-dates")
def get_min_max_data_dates():

  db = MariaDB()
  df = db.qry_read_data(
      "select max(FROM_UNIXTIME(date, '%%Y-%%m-%%d %%H:%%i:%%S')) as maxdate, min(FROM_UNIXTIME(date, '%%Y-%%m-%%d %%H:%%i:%%S')) AS mindate from Mkt_History_Px"
  )
  res = dict()
  if df is not None:
    res['min_date'] = df['mindate'].values[0]
    res['max_date'] = df['maxdate'].values[0]
    res['error_msg'] = 'No Data found in Mkt_History_Px Table'
  else:
    res['min_date'] = ""
    res['max_date'] = ""
    res['error_msg'] = ''

  return res


@data_pages.post("/api/data/get-avail-coins")
def get_avail_coins():
  """
  Retrieves a list of coins either between a start and end date or all the coins available in the History DB
  """

  isall: bool = bool(request.json['isall'])
  startdate: str = request.json['startdate']
  enddate: str = request.json['enddate']

  coin_list = []
  error_msg = ""

  if isall:
    db = MariaDB()
    df = db.qry_read_data("select DISTINCT coin from Mkt_History_Px")
    if df is not None:
      coin_list = df['coin'].unique().tolist()
  else:
    return make_response('failure')

  res = dict()
  res['coin_list'] = coin_list
  res['error_msg'] = ''

  return res


@data_pages.post("/api/data/get-hist-data")
def get_hist_data():
  """
  Retrieves a list of coins either between a start and end date or all the coins available in the History DB
  """
  startdate: str = request.json['startdate']
  enddate: str = request.json['enddate']
  coinliststr: str = request.json['coinlist'].strip()

  if len(coinliststr) > 0:
    coinlist = coinliststr.split(',')
  else:
    coinlist = []

  db = MariaDB()

  where_date_clause = ''
  if startdate != '':
    startdate_dt = dateutil.parser.isoparse(startdate)
    startdate_unix = int(time.mktime(startdate_dt.timetuple()))
    where_date_clause += f' and `date` >= {startdate_unix}'

  if enddate != '':
    enddate_dt = dateutil.parser.isoparse(enddate)
    enddate_unix = int(time.mktime(enddate_dt.timetuple()))
    logger.info(f'enddate_unix: {enddate_unix}')
    where_date_clause += f' and `date` <= {enddate_unix}'

  where_coin_clause = ''
  if len(coinlist) > 0:
    coins_as_str = "'{}'".format("','".join(coinlist))
    where_coin_clause = f' and coin in ({coins_as_str})'

  qry = f"""       
    select `date`, FROM_UNIXTIME(date, '%%Y-%%m-%%d %%H:%%i:%%S') AS isodate, coin, high, low, open, close, volume, quoteVolume, weightedAverage from Mkt_History_Px
    WHERE coin != ''
    {where_coin_clause}
    {where_date_clause}
    order by `date` desc
    limit 10000
  """
  logger.info(f'get_hist_data: {qry}')
  df = db.qry_read_data(qry)

  res = dict()
  if df is not None:
    res['hist_data'] = df.to_json(orient="records")
  else:
    res['hist_data'] = []
  res['error_msg'] = 'No Data found in Mkt_History_Px for specified coin / date'
  return res


@data_pages.post("/api/data/download-hist-data")
def downloadHistoricData():
  startdate: str = request.json['startdate']
  enddate: str = request.json['enddate']
  coinnum: int = request.json['coinnum']
