import logging
import sys
import os
from logging import Logger

from logging.handlers import TimedRotatingFileHandler
from datetime import datetime
import pytz

tz = pytz.timezone("Asia/Tokyo")


class MainLogger(Logger):

  def __init__(self,
               log_name: str = "main",
               log_file_name: str = None,
               error_file_name: str = None,
               add_console_handler: bool = True,
               trainingloghandler: logging.Handler = None,
               log_format: str = "[%(asctime)s]%(filename)s:%(lineno)d[%(levelname)s]%(message)s",
               *args,
               **kwargs):

    self.formatter = logging.Formatter(log_format)
    self.log_file = log_name

    Logger.__init__(self, log_name)

    # create path structure to put logs
    if not os.path.exists(os.path.join("models", "logs")):
      os.makedirs("models/logs")

    if add_console_handler:
      self.addHandler(self.get_console_handler())
    if log_file_name:
      self.log_file = log_file_name
      self.log_file = f'{self.log_file}_{datetime.now(tz).strftime("%Y%m%d")}.log'
      full_log_path: str = os.path.join("models", "logs", self.log_file)
      self.addHandler(self.get_file_handler(full_log_path))
    if error_file_name:
      self.log_error_file = error_file_name
      self.log_error_file = f'{self.log_error_file}_{datetime.now(tz).strftime("%Y%m%d")}.log'
      full_log_path: str = os.path.join("models", "logs", self.log_error_file)
      self.addHandler(self.get_error_file_handler(full_log_path))
    if trainingloghandler:
      self.addHandler(trainingloghandler)

    # with this pattern, it's rarely necessary to propagate the| error up to parent
    # self.propagate = False

  def get_console_handler(self):
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(self.formatter)
    console_handler.setLevel(logging.DEBUG)
    return console_handler

  def get_file_handler(self, full_path: str):
    file_handler = TimedRotatingFileHandler(full_path, when="midnight")
    file_handler.setFormatter(self.formatter)
    file_handler.setLevel(logging.DEBUG)
    return file_handler

  def get_error_file_handler(self, full_path: str):
    error_file_handler = TimedRotatingFileHandler(full_path, when="midnight")
    error_file_handler.setFormatter(self.formatter)
    error_file_handler.setLevel(logging.ERROR)
    return error_file_handler
