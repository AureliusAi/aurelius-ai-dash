import time
from scipy.stats import norm
from flask import Flask
from flask_sock import Sock 
from datetime import datetime
import pytz

tz = pytz.timezone('Asia/Tokyo')

app = Flask(__name__, static_folder="../build", static_url_path='/')
sock = Sock(app)

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

@sock.route('/api/ws/echo')
def echo(ws):
  while True:
    data = ws.receive()
    
    dt_stamp = datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S")
    print(f'\tsending back: [{dt_stamp}] {data}')
    ws.send(f'[{dt_stamp}] {data}')


@sock.route('/api/ws/random-walk')
def random_walk(ws):
  delta = 0.25
  dt = 2.0
  x = 0.0
  while True:
    x = x + norm.rvs(scale=delta**2*dt)
    print(x)
    time.sleep(1)
    ws.send(x)