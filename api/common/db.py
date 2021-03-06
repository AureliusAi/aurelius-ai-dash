import sqlite3
import sqlalchemy
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
import pymysql
import pymysql.cursors
import pandas as pd
from typing import Tuple
import pandas as pd
import os


class MariaDB:

  username: str = 'aurelius'
  dbpw: str = 'Wtshnn123#'

  def qry_read_data(self, qry: str, database: str = 'AureliusAi') -> pd.DataFrame:
    db_connection_str = f'mysql+pymysql://{self.username}:{self.dbpw}@localhost/{database}'
    engine = sqlalchemy.create_engine(db_connection_str)
    df = pd.read_sql(qry, con=engine)
    engine.dispose()
    return df

  def get_pymysql_connection(self, database: str = 'AureliusAi'):
    """returns a pymysql connection object to the AureliusAi DB

    Args:
        database (str, optional): _description_. Defaults to 'AureliusAi'.

    Returns:
        _type_: pymysql connection object onto which queries can be done
    """
    return pymysql.connect(host='localhost', user=self.username, password=self.dbpw, db=database, cursorclass=pymysql.cursors.DictCursor)

  def insert_list_data(self, sql: str, input_list: list, database: str = 'AureliusAi'):
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
    connection = pymysql.connect(host='localhost', user=self.username, password=self.dbpw, db=database, cursorclass=pymysql.cursors.DictCursor)

    isError: bool = False
    errorTxt: str = ""
    try:
      with connection.cursor() as cursor:

        cursor.executemany(sql, input_list)
      # connection is not autocommit by default. So you must commit to save
      # your changes.
      connection.commit()
    except pymysql.Error as e:
      isError = True
      errorTxt = str(e)
      cursor.close()

    finally:
      connection.close()

    return isError, errorTxt

  def update_or_delete_data(self, sql: str, database: str = 'AureliusAi'):
    connection = pymysql.connect(host='localhost', user=self.username, password=self.dbpw, db=database, cursorclass=pymysql.cursors.DictCursor)
    updated_rows: int = 0
    isError: bool = False
    errorTxt: str = ''
    try:
      cursor = connection.cursor()
      updated_rows = cursor.execute(sql)
      connection.commit()
    except pymysql.Error as e:
      isError = True
      errorTxt = str(e)
      cursor.close()

    finally:
      # Close connection.
      connection.close()

      return updated_rows, isError, errorTxt

  def insert_data_frame(self, df: pd.DataFrame, dbtable: str, database: str = 'AureliusAi', if_exists: str = 'append') -> str:
    db_connection_str = f'mysql+pymysql://{self.username}:{self.dbpw}@localhost/{database}'
    engine = sqlalchemy.create_engine(db_connection_str)
    try:
      df.to_sql(dbtable, con=engine, if_exists=if_exists, index=False)
      engine.dispose()
      return ""
    except SQLAlchemyError as e:
      error = str(e.__dict__['orig'])
      engine.dispose()
      return error


class SqliteDataDB:

  def __init__(self):
    self.DATABASE_DIR = 'models/database/Data.db'
    print(os.getcwd())
    self.SQLALCHEMY_PATH = 'sqlite:///models/database/Data.db'

  def qry_read_data(self, sql: str, parse_dates_cols: list = None, index_col: str = None):
    with sqlite3.connect(self.DATABASE_DIR) as connection:
      error_msg: str = ""
      try:
        df = pd.read_sql_query(sql, con=connection, parse_dates=parse_dates_cols, index_col=index_col)
      except sqlite3.Error as err:
        error_msg = err.message
        return None, error_msg

      return df, error_msg

  def insert_data_frame(self, df: pd.DataFrame, table_name: str, if_exists='append'):
    """bulk insert a Pandas Dataframe into the Sqlite DB

    Args:
        df (pd.DataFrame): _description_
        if_exists (str, optional): _description_. Defaults to 'append'.
    """
    engine = sqlalchemy.create_engine(self.SQLALCHEMY_PATH, echo=False)
    df.to_sql(table_name, con=engine, if_exists=if_exists)

  def insert_bulk_data(self, sql: str, input_list: list):
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

  def update_or_delete_data(self, sql: str):
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
