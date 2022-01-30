import json
from flask import Blueprint, request, jsonify, make_response,url_for,redirect
from datetime import datetime
import dateutil.parser
import time

from common.db import SqliteDataDB

config_pages = Blueprint("config", __name__)


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
  status, error_msg = db.insert_bulk_data("INSERT INTO Config_NN (Name, Definition, CreateUser) VALUES (?,?,?)", input_list)

  res = dict()
  res['status'] = status
  res['error_msg'] = error_msg

  return res