import sqlite3
from typing import Tuple
import pandas as pd

class SqliteDataDB:

  def __init__(self):
    self.DATABASE_DIR = 'models/database/Data.db'

  def qry_read_data(self, sql:str, parse_dates_cols:list=None, index_col:str=None):
    with sqlite3.connect(self.DATABASE_DIR) as connection:
      error_msg: str = ""
      try:
        df = pd.read_sql_query(sql, con=connection, parse_dates=parse_dates_cols, index_col=index_col)
      except sqlite3.Error as err:
        error_msg = err.message
        return None, error_msg
      
      return df, error_msg

  def insert_bulk_data(self, sql:str, input_list:list):
    """Insert data into the SQL DB

    Args:
        sql (str): the sql statement in the bulk upload format using ? marks
        input_dict (list): list of tuples containing all the instances to insert into the DB

          example: 
          
          sql: INSERT INTO syain VALUES (?,?,?)
          input_list: [(1,'鈴木','suzuki'),
          (2,'田中','tanaka'),
          (3,'佐藤','sato'),
          ]

    Returns:
        [type]: err
    """
    with sqlite3.connect(self.DATABASE_DIR, timeout=10) as conn:

      c = conn.cursor()
      isError: bool = False
      errorTxt: str = ""
      try:
        c.executemany(sql, input_list)
      except sqlite3.Error as e:
        print(e)
        isError = True
        errorTxt = str(e)

      conn.commit()

      return isError, errorTxt


  def update_or_delete_data(self, sql:str):
    """delete/update data in the SQL DB

    Args:
        sql (str): the sql statement containing delete/update statement

    Returns:
        [type]: err
    """
    with sqlite3.connect(self.DATABASE_DIR, timeout=10) as conn:

      cursor = conn.cursor()
      isError: bool = False
      errorTxt: str = ""
      updated_rows = -1
      try:
        cursor.execute(sql)
        conn.commit()
        row_count = cursor.rowcount
        print('update or delete row count: ' + str(row_count))
        updated_rows = row_count
        cursor.close()

      except sqlite3.Error as e:
        print(e)
        isError = True
        errorTxt = str(e)
        cursor.close()

      return updated_rows, isError, errorTxt
