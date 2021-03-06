from __future__ import print_function
from __future__ import absolute_import
from __future__ import division
import models.pgportfolio.marketdata.globaldatamatrix as gdm
import numpy as np
import pandas as pd

from models.pgportfolio.tools.configprocess import parse_time
from models.pgportfolio.tools.data import get_volume_forward, get_type_list
import models.pgportfolio.marketdata.replaybuffer as rb

from common.custom_logger2 import get_custom_logger, get_custom_training_logger

logger = get_custom_logger(__name__)
training_logger = get_custom_training_logger(__name__)

MIN_NUM_PERIOD = 3


class DataMatrices:

  def __init__(self,
               start,
               end,
               period,
               batch_size=50,
               volume_average_days=30,
               buffer_bias_ratio=0,
               data_provider="POLONIEX",
               coin_filter=1,
               window_size=50,
               feature_number=3,
               test_portion=0.15,
               portion_reversed=False,
               online=False,
               is_permed=False):
    """

        This class stores info regarding the input data matricies to be used by the algo.
        It does not hold the data itself

        :param start: Unix time
        :param end: Unix time
        :param access_period: the data access period of the input matrix.
        :param trade_period: the trading period of the agent.
        :param global_period: the data access period of the global price matrix.
                              if it is not equal to the access period, there will be inserted observations
        :param coin_filter: number of coins that would be selected
        :param window_size: periods of input data
        :param train_portion: portion of training set
        :param is_permed: if False, the sample inside a mini-batch is in order
        :param validation_portion: portion of cross-validation set
        :param test_portion: portion of test set
        :param portion_reversed: if False, the order to sets are [train, validation, test]
        else the order is [test, validation, train]
        """
    start = int(start)
    self.__start = start
    self.__end = int(end)

    logger.info('__start timestamp: {self.__start}')
    logger.info('__end timestamp: {self.__end}')

    # assert window_size >= MIN_NUM_PERIOD
    self.__coin_no = coin_filter
    type_list = get_type_list(feature_number)
    self.__features = type_list
    self.feature_number = feature_number
    volume_forward = get_volume_forward(self.__end - start, test_portion, portion_reversed)
    self.__history_manager = gdm.HistoryManager(coin_number=coin_filter,
                                                end=self.__end,
                                                volume_average_days=volume_average_days,
                                                volume_forward=volume_forward,
                                                online=online)
    if data_provider.upper() == "POLONIEX" or len(data_provider) == 0:
      self.__global_data = self.__history_manager.get_global_panel(start, self.__end, period=period, features=type_list)
      logger.info(self.__global_data.shape)
      logger.info(f'num_features = {self.__global_data.shape[1]}')
      # convenience variable to hold global data as array
      global_data_as_array = self.__global_data.values.reshape(self.__coin_no, -1, self.__global_data.shape[1])
      global_data_as_array = global_data_as_array.transpose(2, 0, 1)
      self.__global_data_array = np.array(global_data_as_array)
    else:
      raise ValueError("market {} is not valid".format(data_provider))
    self.__period_length = period
    # portfolio vector memory, [time, assets]
    logger.info(f'Data Frame: level(0) = {self.__global_data.index.get_level_values(0).unique()}')
    self.__PVM = pd.DataFrame(index=self.__global_data.index.get_level_values(1), columns=self.__global_data.index.get_level_values(0).unique())
    self.__PVM = self.__PVM.fillna(1.0 / self.__coin_no)
    logger.info(f'Portfolio Vector Memory: PVM(head)')
    logger.info(self.__PVM.head(10))

    self._window_size = window_size
    logger.info(f'_window_size: {self._window_size}')
    self._num_periods = self.__global_data.index.levshape[1]
    logger.info(f'_num_periods: {self._num_periods}')
    self.__divide_data(test_portion, portion_reversed)

    self._portion_reversed = portion_reversed
    self.__is_permed = is_permed
    logger.info(f'__is_permed: {self.__is_permed}')

    self.__batch_size = batch_size
    logger.info(f'__batch_size: {self.__batch_size}')
    self.__delta = 0  # the count of global increased
    end_index = self._train_ind[-1]
    self.__replay_buffer = rb.ReplayBuffer(start_index=self._train_ind[0],
                                           end_index=end_index,
                                           sample_bias=buffer_bias_ratio,
                                           batch_size=self.__batch_size,
                                           coin_number=self.__coin_no,
                                           is_permed=self.__is_permed)

    logger.info("the number of training examples is %s"
                ", of test examples is %s" % (self._num_train_samples, self._num_test_samples))
    logger.info("the training set is from %s to %s" % (min(self._train_ind), max(self._train_ind)))
    logger.info("the test set is from %s to %s" % (min(self._test_ind), max(self._test_ind)))

  @property
  def global_weights(self):
    return self.__PVM

  @staticmethod
  def create_from_config(config):
    """main method to create the DataMatrices in this project
        @:param config: config dictionary
        @:return: a DataMatrices object
        """
    config = config.copy()
    input_config = config["input"]
    train_config = config["training"]
    start = parse_time(input_config["start_date"])
    end = parse_time(input_config["end_date"])
    return DataMatrices(
        start=start,
        end=end,
        feature_number=input_config["feature_number"],
        window_size=input_config["window_size"],
        online=input_config["online"],
        data_provider=input_config["data_provider"],
        period=input_config["global_period"],
        coin_filter=input_config["coin_number"],
        is_permed=input_config["is_permed"],
        buffer_bias_ratio=train_config["buffer_biased"],
        batch_size=train_config["batch_size"],
        volume_average_days=input_config["volume_average_days"],
        test_portion=input_config["test_portion"],
        portion_reversed=input_config["portion_reversed"],
    )

  @property
  def global_matrix(self):
    return self.__global_data

  @property
  def coin_list(self):
    return self.__history_manager.coins

  @property
  def num_train_samples(self):
    return self._num_train_samples

  @property
  def test_indices(self):
    return self._test_ind[:-(self._window_size + 1):]

  @property
  def num_test_samples(self):
    return self._num_test_samples

  def append_experience(self, online_w=None):
    """
        :param online_w: (number of assets + 1, ) numpy array
        Let it be None if in the backtest case.
        """
    self.__delta += 1
    self._train_ind.append(self._train_ind[-1] + 1)
    appended_index = self._train_ind[-1]
    self.__replay_buffer.append_experience(appended_index)

  def get_test_set(self):
    return self.__pack_samples(self.test_indices)

  def get_training_set(self):
    return self.__pack_samples(self._train_ind[:-self._window_size])

  def next_batch(self):
    """
        @:return: the next batch of training sample. The sample is a dictionary
        with key "X"(input data); "y"(future relative price); "last_w" a numpy array
        with shape [batch_size, assets]; "w" a list of numpy arrays list length is
        batch_size
        """
    batch = self.__pack_samples([exp.state_index for exp in self.__replay_buffer.next_experience_batch()])
    return batch

  def __pack_samples(self, indexs):
    indexs = np.array(indexs)
    last_w = self.__PVM.values[indexs - 1, :]

    def setw(w):
      self.__PVM.iloc[indexs, :] = w

    M = [self.get_submatrix(index) for index in indexs]
    M = np.array(M)
    X = M[:, :, :, :-1]
    y = M[:, :, :, -1] / M[:, 0, None, :, -2]
    return {"X": X, "y": y, "last_w": last_w, "setw": setw}

  # volume in y is the volume in next access period
  def get_submatrix(self, ind):
    #logger.info(f'extracting training-data indicies [{ind} -> {ind+self._window_size+1}]')
    gd = self.__global_data
    dta = self.__global_data_array
    sl = self.__global_data_array[:, :, ind:ind + self._window_size + 1]
    return self.__global_data_array[:, :, ind:ind + self._window_size + 1]

  def __divide_data(self, test_portion, portion_reversed):
    train_portion = 1 - test_portion
    s = float(train_portion + test_portion)
    if portion_reversed:
      portions = np.array([test_portion]) / s
      portion_split = (portions * self._num_periods).astype(int)
      indices = np.arange(self._num_periods)
      self._test_ind, self._train_ind = np.split(indices, portion_split)
    else:
      portions = np.array([train_portion]) / s
      portion_split = (portions * self._num_periods).astype(int)
      indices = np.arange(self._num_periods)
      self._train_ind, self._test_ind = np.split(indices, portion_split)

    self._train_ind = self._train_ind[:-(self._window_size + 1)]

    logger.info(f'indices: {len(indices)}')
    logger.info(f'len _train_ind: {len(self._train_ind)}')
    logger.info(f'len _test_ind: {len(self._test_ind)}')
    logger.info(f'_train_ind: [start]: {self._train_ind[0]}, [end]: {self._train_ind[len(self._train_ind)-1]}')
    logger.info(f'_test_ind: [start]: {self._test_ind[0]}, [end]: {self._test_ind[len(self._test_ind)-1]}')
    # NOTE(zhengyao): change the logic here in order to fit both
    # reversed and normal version
    self._train_ind = list(self._train_ind)
    self._num_train_samples = len(self._train_ind)
    self._num_test_samples = len(self.test_indices)
