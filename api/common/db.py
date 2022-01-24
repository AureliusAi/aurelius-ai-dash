import sqlite3
import pandas as pd

class SqliteDataDB:

  def __init__(self):
    self.DATABASE_DIR = 'models/database/Data.db'

  def qry_read_data(self, sql:str, parse_dates_cols:list=None, index_col:str=None):
    with sqlite3.connect(self.DATABASE_DIR) as connection:
      df = pd.read_sql_query(sql, con=connection, parse_dates=parse_dates_cols, index_col=index_col)
      return df