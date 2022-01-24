import time
from datetime import datetime

import pytz
from flask import Flask, session
from flask_cors import CORS
from flask_socketio import SocketIO, emit, disconnect
from threading import Lock

from scipy.stats import norm
from common.classes import BtcTickerObserver
import common.providers as provider

# import all the pages
from routes.data import data_pages
from routes.training import training_pages

tz = pytz.timezone('Asia/Tokyo')

app = Flask(__name__, static_folder="../build", static_url_path='/')
#cors = CORS(app, resources={r"/api/*": {"origins": "*"}})
cors = CORS(app)
app.register_blueprint(data_pages)
app.register_blueprint(training_pages)

socket_ = SocketIO(app, async_mode=None)

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

@socket_.on('my_event', namespace='/api/ws/echo')
def echo(message):
  while True:
    # data = ws.receive()
    
    # dt_stamp = datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S")
    # print(f'\tsending back: [{dt_stamp}] {data}')
    # ws.send(f'[{dt_stamp}] {data}')

    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response', {'data': message['data'], 'count': session['receive_count']})


# @sock.route('/api/ws/random-walk')
# def random_walk(ws):
#   delta = 0.25
#   dt = 2.0
#   x = 0.0
#   while True:
#     x = x + norm.rvs(scale=delta**2*dt)
#     print(x)
#     time.sleep(1)
#     ws.send(x)


# @sock.route('/api/ws/btc-ticker-feed')
# def btc_ticker_feed(ws):
#   print('got request!!!!!!!')
#   data = ws.receive()
#   print('=========== Request received ========')
#   print(data)
#   btc_observer = BtcTickerObserver()
#   provider.subcribe(btc_observer)
#   while True:
    
#     time.sleep(5)
#     print('sending date !!!!!!!')
#     dt_stamp = datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S")
#     ws.send(f'pong!: {dt_stamp}')


    # px_action = btc_observer.get_latest_px()
    # print('sending px action!: {px_action}')
    # ws.send(px_action)


  # btc_observer = BtcTickerObserver()
  # btc_observer._btc_px_queue.put(1)
  # btc_observer._btc_px_queue.put(2)
  # btc_observer._btc_px_queue.put(3)
  # btc_observer._btc_px_queue.put(4)
  # while(not btc_observer._btc_px_queue.empty()):
  #   next = btc_observer._btc_px_queue.get()
  #   print(next)
  #   ws.send(next)
  # print('-------------------------------------')
  # print('registering myself to btc px feed!!!!')
  # print('-------------------------------------')
  # tp.subscribe(btc_observer)

  # while True:
  #   print('waiting for next px action')
  #   px_action = btc_observer.get_latest_px()
  #   print('sending px action!: {px_action}')
  #   ws.send(px_action)

###############################################################################
# MAIN 
###############################################################################



if __name__ == '__main__':
    socket_.run(app, debug=True)