import logging
import sys
import os
from datetime import datetime
from multiprocessing import Queue
from logging.handlers import TimedRotatingFileHandler
import pytz

tz = pytz.timezone("Asia/Tokyo")

LOG_FORMATTER = logging.Formatter("%(asctime)s - %(module)s - %(name)s - %(levelname)s - %(message)s")

global_training_queue: Queue = Queue(-1)


class SendToSocketTrainingLogHandler(logging.Handler):

  global global_training_queue

  def __init__(self):
    logging.Handler.__init__(self)
    self.formatter = LOG_FORMATTER
    self.level = logging.DEBUG

  def emit(self, record):
    log_entry = self.format(record)
    global_training_queue.put(log_entry)


SendToSocketTrainingLogHandler_Instance = SendToSocketTrainingLogHandler()

# create path structure to put logs
if not os.path.exists(os.path.join("models", "logs")):
  os.makedirs("models/logs")


def get_console_handler():
  console_handler = logging.StreamHandler(sys.stdout)
  console_handler.setFormatter(LOG_FORMATTER)
  console_handler.setLevel(logging.DEBUG)
  return console_handler


def get_file_handler():
  log_file: str = f'Syslog_{datetime.now(tz).strftime("%Y%m%d")}.log'
  full_log_path: str = os.path.join("models", "logs", log_file)
  file_handler = TimedRotatingFileHandler(full_log_path, when="midnight")
  file_handler.setFormatter(LOG_FORMATTER)
  file_handler.setLevel(logging.DEBUG)
  return file_handler


def get_error_file_handler():
  log_error_file = f'ERROR_syslog_{datetime.now(tz).strftime("%Y%m%d")}.log'
  full_log_path: str = os.path.join("models", "logs", log_error_file)
  error_file_handler = TimedRotatingFileHandler(full_log_path, when="midnight")
  error_file_handler.setFormatter(LOG_FORMATTER)
  error_file_handler.setLevel(logging.ERROR)
  return error_file_handler


def get_custom_logger(logger_name, add_console_logger: bool = True):
  logger = logging.getLogger(logger_name)
  logger.setLevel(logging.DEBUG)  # better to have too much log than not enough
  if add_console_logger:
    logger.addHandler(get_console_handler())
  logger.addHandler(get_file_handler())
  logger.addHandler(get_error_file_handler())

  # with this pattern, it's rarely necessary to propagate the error up to parent
  logger.propagate = False

  return logger


def get_custom_training_logger(logger_name):
  global SendToSocketTrainingLogHandler_Instance
  logger = logging.getLogger(logger_name)
  logger.setLevel(logging.DEBUG)  # better to have too much log than not enough
  training_queue_handler = SendToSocketTrainingLogHandler_Instance
  logger.addHandler(training_queue_handler)

  # with this pattern, it's rarely necessary to propagate the error up to parent
  logger.propagate = False

  return logger
