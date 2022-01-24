from __future__ import annotations
from abc import ABC, abstractmethod
import queue
from random import randrange
from typing import List


class TickerObserver(ABC):
    """
    The Observer interface declares the update method, used by subjects.
    """

    @abstractmethod
    def update(self, subject: ObservationTarget) -> None:
        """
        Receive update from subject.
        """
        pass


class ObservationTarget(ABC):
    """
    The Subject interface declares a set of methods for managing subscribers.
    """

    @abstractmethod
    def subscribe(self, observer: TickerObserver) -> None:
        """
        Attach an observer to the subject.
        """
        pass

    @abstractmethod
    def unsubscribe(self, observer: TickerObserver) -> None:
        """
        Detach an observer from the subject.
        """
        pass

    @abstractmethod
    def notify(self) -> None:
        """
        Notify all observers about an event.
        """
        pass



class BtcTickerObserver(TickerObserver):

  _btc_px_queue = queue.Queue(10)

  def update(self, message: dict) -> None:
    self._btc_px_queue.put(message, block=False)

  def get_latest_px(self) -> dict:
    return self._btc_px_queue.get(block=True)