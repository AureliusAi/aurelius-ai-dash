from flask import Blueprint, request, jsonify, make_response,url_for,redirect
from datetime import datetime
import dateutil.parser
import time

from common.db import SqliteDataDB

data_pages = Blueprint("data", __name__)


@data_pages.get("/api/data/get-min-max-data-dates")
def get_min_max_data_dates():

  db = SqliteDataDB()
  df, err_msg = db.qry_read_data("select max(DATETIME(ROUND(date), 'unixepoch')) as maxdate, min(DATETIME(ROUND(date), 'unixepoch')) AS mindate from History")
  res = dict()
  if df is not None:
    res['min_date'] = df['mindate'].values[0]
    res['max_date'] = df['maxdate'].values[0]
    res['error_msg'] = err_msg
  else:
    res['min_date'] = ""
    res['max_date'] = ""
    res['error_msg'] = err_msg

  return res


@data_pages.post("/api/data/get-avail-coins")
def get_avail_coins():
  """
  Retrieves a list of coins either between a start and end date or all the coins available in the History DB
  """

  isall:bool = bool(request.json['isall'])
  startdate:str = request.json['startdate']
  enddate:str = request.json['enddate']

  coin_list = []
  error_msg = ""

  if isall:
    db = SqliteDataDB()
    df, error_msg = db.qry_read_data("select DISTINCT coin from History")
    if df is not None:
      coin_list = df['coin'].unique().tolist()
  else:
    return make_response('failure')

  res = dict()
  res['coin_list'] = coin_list
  res['error_msg'] = error_msg

  return res


@data_pages.post("/api/data/get-hist-data")
def get_hist_data():
  """
  Retrieves a list of coins either between a start and end date or all the coins available in the History DB
  """
  startdate:str = request.json['startdate']
  enddate:str = request.json['enddate']
  coinliststr:str = request.json['coinlist'].strip()

  if len(coinliststr) > 0:
    coinlist = coinliststr.split(',')
  else:
    coinlist = []

  db = SqliteDataDB()

  where_date_clause = ''
  if startdate != '':
    startdate_dt = dateutil.parser.isoparse(startdate)
    startdate_unix = int(time.mktime(startdate_dt.timetuple()))
    where_date_clause += f' and `date` >= {startdate_unix}'

  if enddate != '':
    enddate_dt = dateutil.parser.isoparse(enddate)
    enddate_unix = int(time.mktime(enddate_dt.timetuple()))
    print(enddate_unix)
    where_date_clause += f' and `date` <= {enddate_unix}'

  where_coin_clause = ''
  if len(coinlist) > 0:
    coins_as_str = "'{}'".format("','".join(coinlist))
    where_coin_clause = f' and coin in ({coins_as_str})'

  qry = f"""
    select `date`, DATETIME(ROUND(date), 'unixepoch') AS isodate, coin, high, low, open, close, volume, quoteVolume, weightedAverage from History
    WHERE coin != ''
    {where_coin_clause}
    {where_date_clause}
    order by `date` desc
    limit 10000
  """
  print(f'get_hist_data: {qry}')
  df, error_msg = db.qry_read_data(qry)
  
  res = dict()
  if df is not None:
    res['hist_data'] = df.to_json(orient="records")
  else:
    res['hist_data'] = []
  res['error_msg'] = error_msg
  return res

