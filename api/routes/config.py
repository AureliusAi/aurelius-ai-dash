import json
import time
from datetime import datetime
import numpy as np
import pandas as pd

import dateutil.parser
from common.db import MariaDB
from flask import Blueprint, jsonify, make_response, redirect, request, url_for

config_pages = Blueprint("config", __name__)


@config_pages.get("/api/config/nn/get-names-list")
def get_avail_nn_names():
  """
  Retrieves a list of only the names of live NNs from NN_Config
  """

  nn_list = []

  db = MariaDB()
  qry = f"""
    select `Name` as instance_name, `Version` as version, UpdateDate
    from Config_NN main
    inner join (
      select `Name` as mName, max(`Version`) as mVersion, isDeleted as maxIsDeleted
	  from Config_NN
      Group by `Name`
    ) maxv on main.Name = maxv.mName and main.Version = maxv.mVersion 
    Where maxIsDeleted = 0
    Order by `Name`
  """
  print(f'get all NN instances: {qry}')
  df = db.qry_read_data(qry)
  if df is None:
    res = dict()
    res['nn_list'] = []
    res['error_msg'] = 'No NN found in the DB'
    return res

  nn_list = df['instance_name'].unique().tolist()

  res = dict()
  res['nn_list'] = nn_list

  return res


@config_pages.get("/api/config/models/get-names-list")
def get_avail_model_names():
  """
  Retrieves a list of only the names of Models from Training_Results table
  """

  model_list = []

  db = MariaDB()
  qry = f"""
    select 
      CASE WHEN `label` IS NOT NULL THEN
          CONCAT(`key`,' -- ', `label`)
        ELSE `key` 
        END as `key` 
      FROM Training_Results
    ORDER BY `key` desc
  """
  print(f'get all distinct Model instances: {qry}')
  df = db.qry_read_data(qry)
  if df is None:
    res = dict()
    res['model_list'] = []
    res['error_msg'] = 'No Model Labels found in the DB'
    return res

  model_list = df['key'].unique().tolist()

  res = dict()
  res['model_list'] = model_list

  return res


@config_pages.get("/api/config/nn/get-all")
def get_all_nn_instances():
  db = MariaDB()
  qry = f"""
    select `Name` as instance_name, `Version` as version, `CreateUser` as created_by, 
    `Definition` as nn_definition, `CreateDate` as creation_date, `UpdateDate` as updatedAt from Config_NN main
    inner join (
      select `Name` as mName, max(`Version`) as mVersion, max(`UpdateDate`) as mUpdateDate, isDeleted as maxIsDeleted from Config_NN
      Group by `Name`
    ) maxv on main.Name = maxv.mName and main.Version = maxv.mVersion and  main.UpdateDate = maxv.mUpdateDate
    Where maxIsDeleted = 0
    Order by `UpdateDate` desc
  """
  print(f'get all NN instances: {qry}')
  df = db.qry_read_data(qry)
  if df is None:
    res = dict()
    res['nn_instances'] = []
    res['error_msg'] = ''
    return res
  print(df.dtypes)
  df['creation_date'] = df['creation_date'].dt.strftime('%Y-%m-%d %H:%M:%S')
  df['updatedAt'] = df['updatedAt'].dt.strftime('%Y-%m-%d %H:%M:%S')

  res = dict()
  res['nn_instances'] = df.to_json(orient="records")

  return res


@config_pages.post("/api/config/nn/update-instance")
def update_nn_instance():

  inst_name: str = request.json['instance_to_update']
  inst_definition: str = request.json['instance_definition_to_update']

  # first get the latest version and user
  # note because we are creating a new entry in the DB, we need to get the Create Date because we want to keep the orginal
  db = MariaDB()
  qry = f"""
    select `Name` as instance_name, `Version` as version, `CreateUser` as created_by, `CreateDate` as created_date
    from Config_NN main
    inner join (
      select `Name` as mName, max(`Version`) as mVersion, max(`UpdateDate`) as mUpdateDate from Config_NN
      Group by `Name`
    ) maxv on main.Name = maxv.mName and main.Version = maxv.mVersion and  main.UpdateDate = maxv.mUpdateDate
    where `Name` = '{inst_name}'
    Order by `UpdateDate` desc
    LIMIT 1
  """
  df_existing = db.qry_read_data(qry)
  if df_existing is None:
    res = dict()
    res['is_error'] = True
    res['error_msg'] = ''
    return res

  next_ver: str = str(int(df_existing['version'].values[0]) + 1)
  created_user: str = df_existing['created_by'].values[0]
  created_date: str = df_existing['created_date'].values[0]

  db = MariaDB()
  input_list = []
  input_list.append((inst_name, next_ver, inst_definition, created_date, created_user))
  is_error, error_msg = db.insert_list_data("INSERT INTO Config_NN (Name, Version, Definition, CreateDate, CreateUser) VALUES (%s, %s, %s, %s, %s)", input_list)

  db = MariaDB()
  qry = f"""
    select `Name` as instance_name, `Version`, `CreateDate`, `UpdateDate` 
    from Config_NN main
    where `Name` = '{inst_name}' and `Version` = '{next_ver}'
    LIMIT 1
  """
  create_date: str = ""
  update_date: str = ""
  df_existing = db.qry_read_data(qry)
  if df_existing is None:
    res = dict()
    res['is_error'] = True
    res['error_msg'] = f"No NN data exists where `Name` = '{inst_name}' and `Version` = '{next_ver}' "
    return res
  else:
    create_date = df_existing['CreateDate'].values[0]
    update_date = df_existing['UpdateDate'].values[0]

    if isinstance(create_date, np.datetime64):
      create_date_t = pd.to_datetime(str(create_date))
      create_date = create_date_t.strftime('%Y-%m-%d %H:%M:%S')
      update_date_t = pd.to_datetime(str(create_date))
      update_date = update_date_t.strftime('%Y-%m-%d %H:%M:%S')

  res = dict()
  res['is_error'] = is_error
  res['error_msg'] = error_msg
  res['Name'] = inst_name
  res['Version'] = next_ver
  res['Definition'] = inst_definition
  res['CreateUser'] = created_user
  res['CreateDate'] = create_date
  res['UpdateDate'] = update_date

  return res


@config_pages.post("/api/config/nn/delete-instance")
def delete_nn_instance():

  inst_name: str = request.json['instance_to_delete']
  inst_version: str = request.json['instance_version_to_delete']

  db = MariaDB()
  qry = f"""
    update Config_NN 
    set IsDeleted = 1
    where `Name` = '{inst_name}'
    and `Version` = '{inst_version}'
  """
  print(f'delete NN instance: {qry}')
  updated_rows, is_error, error_msg = db.update_or_delete_data(qry)

  res = dict()
  res['is_error'] = is_error
  res['error_msg'] = error_msg
  res['updated_rows'] = updated_rows
  return res


@config_pages.post("/api/config/nn/save-new-instance")
def save_new_neural_network():
  """
  Retrieves a list of coins either between a start and end date or all the coins available in the History DB
  """

  inst_name: str = request.json['inst_name']
  inst_definition: str = json.dumps(request.json['inst_definition'])
  user: str = request.json['user']

  print("============== save_new_neural_network ================")
  print(f'inst_name: {inst_name}')
  print(f'inst_definition: {inst_definition}')
  print(type(inst_definition))
  print(f'user: {user}')

  db = MariaDB()
  input_list = []
  input_list.append((inst_name, inst_definition, user))
  is_error, error_msg = db.insert_list_data("INSERT INTO Config_NN (Name, Definition, CreateUser) VALUES (%s,%s,%s)", input_list)

  res = dict()
  res['is_error'] = is_error
  res['error_msg'] = error_msg

  return res
