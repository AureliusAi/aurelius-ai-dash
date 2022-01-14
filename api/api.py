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

@sock.route('/echo')
def echo(ws):
  while True:
    data = ws.receive()
    
    dt_stamp = datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S")
    print(f'\tsending back: [{dt_stamp}] {data}')
    ws.send(f'[{dt_stamp}] {data}')