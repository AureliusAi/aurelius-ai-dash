from datetime import datetime
from multiprocessing import Queue
from logging import LogRecord

import pytz
from flask import Flask, session
from flask_cors import CORS
from flask_socketio import SocketIO, disconnect, emit

from routes.config import config_pages

# import all the pages
from routes.data import data_pages
from routes.training import training_pages
from routes.models import model_pages
from routes.backtesting import backtesting_pages

from common.custom_logger2 import get_custom_logger, get_custom_training_logger
from common.custom_logger2 import global_training_queue

tz = pytz.timezone("Asia/Tokyo")

########################################################################################
# Set up Logging - this shoudl be the only place the logging config is being set up
########################################################################################

logger = get_custom_logger(__name__)
logger.info("starting log")

training_logger = get_custom_training_logger(__name__)
training_logger.info("starting training socket logger")

# logger = logging.getLogger(__name__)

########################################################################################

app = Flask(__name__, static_folder="../build", static_url_path="/")
app.config["SECRET_KEY"] = "shhhhhhh!"

# cors = CORS(app, resources={r"/api/*": {"origins": "*"}})
cors = CORS(app)
app.register_blueprint(data_pages)
app.register_blueprint(training_pages)
app.register_blueprint(config_pages)
app.register_blueprint(model_pages)
app.register_blueprint(backtesting_pages)

# socket_ = SocketIO(app, async_mode=None)
# |cors_allowed_origins| is required for localhost testing.
socket_ = SocketIO(app, cors_allowed_origins="*")

###############################################################################
# HTTP
###############################################################################


@app.route("/")
def index():
  return app.send_static_file("index.html")


@app.route("/api/time")
def get_current_time():
  ret = dict()
  ret["time"] = datetime.now(tz)
  return ret


###############################################################################
# Web Sockets
###############################################################################


@socket_.on("log_event_stream_start", namespace="/api/ws/training-log")
def training_log_stream():

  global global_training_queue

  while True:
    try:
      log = global_training_queue.get(block=True)
      if isinstance(log, LogRecord) or isinstance(log, str):
        emit("server-msg", {"data": log})
      else:
        print('!!log message is not instance of LogRecord/str!!')
        print(type(log))
        print(log)
    except Exception as e:
      print(str(e))
      print("LOG FILE TAMPERED WITH!! ignore....")


@socket_.on("echo_event", namespace="/api/ws/echo")
def echo(msg):

  dt_stamp = datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S")
  reply_msg: str = f'{msg["message"]}'
  logger.info("\tsend back msg: {reply_msg}")
  emit("echoed-msg", {"data": reply_msg})


###############################################################################
# MAIN
###############################################################################

if __name__ == "__main__":
  socket_.run(app, debug=True)
