import os
import time
from datetime import datetime

import pytz
from flask import Flask, session
from flask_cors import CORS
from flask_socketio import SocketIO, emit, disconnect
from threading import Lock

import json
import websocket


from scipy.stats import norm
from common.classes import BtcTickerObserver
import common.providers as provider

# import all the pages
from routes.data import data_pages
from routes.training import training_pages
from routes.config import config_pages

tz = pytz.timezone('Asia/Tokyo')

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
    cached_stamp = 0

    log_file_name = 'training_log.log'
    log_path = './models/logs/training_log.log'

    def generate():
        fname = "./models/logs/training_log.log"
        with open(fname, "r+") as f:
            yield f.read()
    while True:

        if os.path.exists(log_path):
          stamp = os.stat(log_path).st_mtime
          if stamp != cached_stamp:
              cached_stamp = stamp
              emit_data = next(generate())
              emit('server-msg', {'data':emit_data})


@socket_.on('echo_event', namespace='/api/ws/echo')
def echo(msg):
  
  dt_stamp = datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S")
  reply_msg:str = f'{msg["message"]}'
  print('\tsend back msg: {reply_msg}')
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