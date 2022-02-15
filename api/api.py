import os
import sys
from datetime import datetime
import queue
import threading

import pytz
from flask import Flask, session
from flask_cors import CORS
from flask_socketio import SocketIO, disconnect, emit
from scipy.stats import norm

import common.providers as provider
from common.classes import BtcTickerObserver
from routes.config import config_pages
# import all the pages
from routes.data import data_pages
from routes.training import training_pages

tz = pytz.timezone('Asia/Tokyo')

########################################################################################
# Set up Logging - this shoudl be the only place the logging config is being set up
########################################################################################
import logging
from logging.handlers import QueueHandler
logging_q = queue.Queue()

# create the log file
log_file_name:str = f'syslog_{datetime.now(tz).strftime("%Y%m%d_%H%M%S")}.log'
full_log_path:str = os.path.join('models','logs',log_file_name)

error_log_file_name:str = f'ERROR_LOG_{datetime.now(tz).strftime("%Y%m%d_%H%M%S")}.log'
full_error_log_path:str = os.path.join('models','logs',error_log_file_name)
if not os.path.exists(os.path.join('models','logs')):
  os.makedirs("models/logs")

# create the Log handlers. 1 for STDOUT and 1 for output to a file
file_handler = logging.FileHandler(filename=full_log_path)
error_file_handler = logging.FileHandler(filename=full_error_log_path)
error_file_handler.setLevel(logging.ERROR)
stdout_handler = logging.StreamHandler(sys.stdout)
queue_logging_handler = QueueHandler(logging_q)
handlers = [file_handler, stdout_handler, error_file_handler, queue_logging_handler]

logging.basicConfig(
  level=logging.INFO, 
  format='[%(asctime)s]%(filename)s:%(lineno)d[%(levelname)s]%(message)s',
  handlers=handlers
)

########################################################################################


app = Flask(__name__, static_folder="../build", static_url_path='/')
app.config['SECRET_KEY'] = 'shhhhhhh!'

#cors = CORS(app, resources={r"/api/*": {"origins": "*"}})
cors = CORS(app)
app.register_blueprint(data_pages)
app.register_blueprint(training_pages)
app.register_blueprint(config_pages)

#socket_ = SocketIO(app, async_mode=None)
# |cors_allowed_origins| is required for localhost testing.
socket_ = SocketIO(app, cors_allowed_origins="*")



###############################################################################
# HTTP 
###############################################################################

@app.route('/')
def index():
  return app.send_static_file('index.html')
  

@app.route('/api/time')
def get_current_time():
  ret = dict()
  ret['time'] = datetime.now(tz)
  return ret



###############################################################################
# Web Sockets
###############################################################################

@socket_.on('event_stream', namespace='/api/ws/log/training')
def training_log():

    while True:
        try:
          log:logging.LogRecord = logging_q.get()
          emit('server-msg', {'data':log.msg})
        except Exception as e:
          print(str(e))
          logging.warning("LOG FILE TAMPERED WITH!! ignore....")


@socket_.on('echo_event', namespace='/api/ws/echo')
def echo(msg):
  
  dt_stamp = datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S")
  reply_msg:str = f'{msg["message"]}'
  logging.info('\tsend back msg: {reply_msg}')
  emit('echoed-msg', {'data':reply_msg})



###############################################################################
# MAIN 
###############################################################################



if __name__ == '__main__':
  socket_.run(app, debug=True)



  # websocket.enableTrace(True)
  # btc_px_ws = websocket.WebSocketApp('wss://api.coin.z.com/ws/public/v1')

  # def on_open(self):
  #     message = {
  #         "command": "subscribe",
  #         "channel": "ticker",
  #         "symbol": "BTC"
  #     }
  #     btc_px_ws.send(json.dumps(message))

  # def on_message(self, message):
  #     print(message)

  # btc_px_ws.on_open = on_open
  # btc_px_ws.on_message = on_message

  # btc_px_ws.run_forever()
