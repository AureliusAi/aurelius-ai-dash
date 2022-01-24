import json
# import websocket
# from typing import List

# from common.classes import TickerObserver

# ws_gmo_public = websocket.WebSocketApp('wss://api.coin.z.com/ws/public/v1')

# observers: List[TickerObserver] = []

# def on_open(self):
#     message = {
#         "command": "subscribe",
#         "channel": "ticker",
#         "symbol": "BTC"
#     }
#     ws_gmo_public.send(json.dumps(message))

# def on_message(self, message):
#     print(f'notifying observers! observer count [{len(observers)}]')
#     print(message)
#     for observer in observers:
#       observer.update(message)

# # Observation Target Override methods
# def subscribe(observer: TickerObserver) -> None:
#     print("Subject: Attached an observer.")
#     observers.append(observer)

# def unsubscribe(observer: TickerObserver) -> None:
#     observers.remove(observer)


# ws_gmo_public.on_open = on_open
# ws_gmo_public.on_message = on_message

# ws_gmo_public.run_forever()