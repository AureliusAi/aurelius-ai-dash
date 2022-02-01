import json
from flask import Blueprint, request, jsonify, make_response,url_for,redirect
from datetime import datetime
import dateutil.parser
import time

from common.db import SqliteDataDB

config_pages = Blueprint("config", __name__)


@config_pages.get("/api/config/nn/get-all")
def get_all_nn_instances():
  db = SqliteDataDB()
  qry = f"""
    select `Name` as instance_name, `Version` as version, `CreateUser` as created_by, 
    `Definition` as nn_definition, `CreateDate` as creation_date, `UpdateDate` as UpdatedAt from Config_NN main
    inner join (
      select `Name` as mName, max(`Version`) as mVersion, max(`UpdateDate`) as mUpdateDate from Config_NN
      Group by `Name`
    ) maxv on main.Name = maxv.mName and main.Version = maxv.mVersion and  main.UpdateDate = maxv.mUpdateDate
    Order by `UpdateDate` desc
  """
  print(f'get all NN instances: {qry}')
  df = db.qry_read_data(qry)
  
  res = dict()
  res['nn_instances'] = df.to_json(orient="records")

  return res


@config_pages.post("/api/config/nn/save-new-instance")
def save_new_neural_network():

  """
  Retrieves a list of coins either between a start and end date or all the coins available in the History DB
  """

  inst_name:str = request.json['inst_name']
  inst_definition:str = json.dumps(request.json['inst_definition'])
  user:str = request.json['user']


  print("============== save_new_neural_network ================")
  print(f'inst_name: {inst_name}')
  print(f'inst_definition: {inst_definition}')
  print(type(inst_definition))
  print(f'user: {user}')

  db = SqliteDataDB()
  input_list = []
  input_list.append((inst_name, inst_definition, user))
  is_error, error_msg = db.insert_bulk_data("INSERT INTO Config_NN (Name, Definition, CreateUser) VALUES (?,?,?)", input_list)

  res = dict()
  res['is_error'] = is_error
  res['error_msg'] = error_msg

  return res