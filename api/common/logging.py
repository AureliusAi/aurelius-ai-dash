
import logging
import queue

class QueueLoggingHandler(logging.Handler):

  def __init__(self, q:queue.Queue):
    self._q = q

  def emit(self, record):
    msg = self.format(record)
    self._q.put(msg)
        