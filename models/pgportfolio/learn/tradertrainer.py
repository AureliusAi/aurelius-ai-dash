#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
import json
import os
import shutil
import time
import collections
import logging
import logging.handlers
from datetime import datetime
import pytz
from pathlib import Path
from multiprocessing import Queue

tz = pytz.timezone("Asia/Tokyo")

# import tflearn
import numpy as np
import pandas as pd
from common.db import SqliteDataDB
import tensorflow.compat.v1 as tf
from models.pgportfolio.learn.nnagent import NNAgent
from models.pgportfolio.marketdata.datamatrices import DataMatrices

from common.custom_logger2 import get_custom_logger, get_custom_training_logger

logger = get_custom_logger(__name__)
training_logger = get_custom_training_logger(__name__)

Result = collections.namedtuple(
    "Result",
    [
        "test_pv",
        "test_log_mean",
        "test_log_mean_free",
        "test_history",
        "config",
        "net_dir",
        "backtest_test_pv",
        "backtest_test_history",
        "backtest_test_log_mean",
        "training_time",
    ],
)


class TraderTrainer:

  def __init__(self, config, fake_data=False, restore_dir=None, save_path=None, device="cpu", agent=None, logging_q: Queue = None):
    """
        :param config: config dictionary
        :param fake_data: if True will use data generated randomly
        :param restore_dir: path to the model trained before
        :param save_path: path to save the model
        :param device: the device used to train the network
        :param agent: the nnagent object. If this is provided, the trainer will not create a new agent by itself. Therefore the restore_dir will not affect anything.
        :param logging_q: the threadsafe queue used to push logging message
        """

    # set up the logger
    qh = logging.handlers.QueueHandler(logging_q)
    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG)
    logger.addHandler(qh)

    training_logger.info("TraderTrainer __init__()")
    self.config = config
    self.train_config = config["training"]
    self.input_config = config["input"]
    self.save_path = save_path
    self.best_metric = 0
    np.random.seed(config["random_seed"])

    self.__window_size = self.input_config["window_size"]
    self.__coin_number = self.input_config["coin_number"]
    self.__batch_size = self.train_config["batch_size"]
    self.__snap_shot = self.train_config["snap_shot"]
    config["input"]["fake_data"] = fake_data

    self._matrix = DataMatrices.create_from_config(config)

    self.test_set = self._matrix.get_test_set()
    if not config["training"]["fast_train"]:
      self.training_set = self._matrix.get_training_set()
    self.upperbound_validation = 1
    self.upperbound_test = 1
    tf.set_random_seed(self.config["random_seed"])
    self.device = device
    if agent:
      self._agent = agent
    else:
      if device == "cpu":
        os.environ["CUDA_VISIBLE_DEVICES"] = ""
        with tf.device("/cpu:0"):
          self._agent = NNAgent(config, restore_dir, device)
      else:
        self._agent = NNAgent(config, restore_dir, device)

  def _evaluate(self, set_name, *tensors):
    if set_name == "test":
      feed = self.test_set
    elif set_name == "training":
      feed = self.training_set
    else:
      raise ValueError()
    result = self._agent.evaluate_tensors(feed["X"], feed["y"], last_w=feed["last_w"], setw=feed["setw"], tensors=tensors)
    return result

  @staticmethod
  def calculate_upperbound(y):
    array = np.maximum.reduce(y[:, 0, :], 1)
    total = 1.0
    for i in array:
      total = total * i
    return total

  def log_between_steps(self, step):
    fast_train = self.train_config["fast_train"]
    # tflearn.is_training(False, self._agent.session)

    summary, v_pv, v_log_mean, v_loss, log_mean_free, weights = self._evaluate("test", self.summary, self._agent.portfolio_value, self._agent.log_mean,
                                                                               self._agent.loss, self._agent.log_mean_free, self._agent.portfolio_weights)
    self.test_writer.add_summary(summary, step)

    if not fast_train:
      summary, loss_value = self._evaluate("training", self.summary, self._agent.loss)
      self.train_writer.add_summary(summary, step)

    # print 'ouput is %s' % out
    logger.info("=" * 50)
    logger.info(f"Step: {step} / {self.train_config['steps']}")
    logger.info("=" * 50)
    if not fast_train:
      logger.info("training loss is %s\n" % loss_value)
    logger.info(f"  the portfolio value on the test is: {v_pv}")
    logger.info(f"  Log_mean is: {v_log_mean}")
    logger.info(f"  loss_value is: {v_loss}")
    logger.info(f"  Log_mean is: {log_mean_free}")
    logger.info(f"  log mean without commission fee is: {v_log_mean}")

    # logger.info("the portfolio value on test set is %s\nlog_mean is %s\n"
    #             "loss_value is %3f\nlog mean without commission fee is %3f\n" % (v_pv, v_log_mean, v_loss, log_mean_free))
    logger.info("=" * 50)

    if not self.__snap_shot:
      self._agent.save_model(self.save_path)
    elif v_pv > self.best_metric:
      self.best_metric = v_pv
      logger.info(f"!!!! Got better model at [{step}] steps, whose test portfolio value is [{v_pv}] !!!!")
      if self.save_path:
        self._agent.save_model(self.save_path)
    self.check_abnormal(v_pv, weights)

  def check_abnormal(self, portfolio_value, weigths):
    if portfolio_value == 1.0:
      logger.info("average portfolio weights {}".format(weigths.mean(axis=0)))

  def next_batch(self):
    batch = self._matrix.next_batch()
    batch_input = batch["X"]
    batch_y = batch["y"]
    batch_last_w = batch["last_w"]
    batch_w = batch["setw"]
    return batch_input, batch_y, batch_last_w, batch_w

  def __init_tensor_board(self, log_file_dir):
    tf.summary.scalar("benefit", self._agent.portfolio_value)
    tf.summary.scalar("log_mean", self._agent.log_mean)
    tf.summary.scalar("loss", self._agent.loss)
    tf.summary.scalar("log_mean_free", self._agent.log_mean_free)
    for layer_key in self._agent.layers_dict:
      tf.summary.histogram(layer_key, self._agent.layers_dict[layer_key])
    for var in tf.trainable_variables():
      tf.summary.histogram(var.name, var)
    grads = tf.gradients(self._agent.loss, tf.trainable_variables())
    for grad in grads:
      tf.summary.histogram(grad.name + "/gradient", grad)
    self.summary = tf.summary.merge_all()
    location = log_file_dir
    self.network_writer = tf.summary.FileWriter(location + "/network", self._agent.session.graph)
    self.test_writer = tf.summary.FileWriter(location + "/test")
    self.train_writer = tf.summary.FileWriter(location + "/train")

  def __print_upperbound(self):
    upperbound_test = self.calculate_upperbound(self.test_set["y"])
    logger.info("upper bound in test is %s" % upperbound_test)

  def train_net(self, log_file_dir="./tensorboard", index="0"):
    """
        :param log_file_dir: logging of the training process
        :param index: sub-folder name under train_package
        :return: the result named tuple
        """
    self.__print_upperbound()
    if log_file_dir:
      if self.device == "cpu":
        with tf.device("/cpu:0"):
          self.__init_tensor_board(log_file_dir)
      else:
        self.__init_tensor_board(log_file_dir)
    starttime = time.time()  # used to time the training process

    total_data_time = 0
    total_training_time = 0

    # loop though number of steps (not epochs)
    for i in range(self.train_config["steps"]):
      step_start = time.time()
      x, y, last_w, setw = self.next_batch()
      finish_data = time.time()
      total_data_time += finish_data - step_start
      self._agent.train(x, y, last_w=last_w, setw=setw)
      total_training_time += time.time() - finish_data
      if i % 1000 == 0 and log_file_dir:
        logger.info("average time for data accessing is %s" % (total_data_time / 1000))
        logger.info("average time for training is %s" % (total_training_time / 1000))
        total_training_time = 0
        total_data_time = 0
        self.log_between_steps(i)

    if self.save_path:
      self._agent.recycle()
      best_agent = NNAgent(self.config, restore_dir=self.save_path)
      self._agent = best_agent

    pv, log_mean = self._evaluate("test", self._agent.portfolio_value, self._agent.log_mean)
    logger.warning("the portfolio value train No.%s is %s log_mean is %s,"
                   " the training time is %d seconds" % (index, pv, log_mean, time.time() - starttime))

    training_result: collections.namedtuple = self.__log_and_save_result(index, time.time() - starttime)

    # dont need to return training_result
    logger.info("$" * 70)
    logger.info("$" * 70)
    logger.info("$ Training Results")
    logger.info("$" * 70)
    logger.info(training_result)
    logger.info("$" * 70)
    return

  def __log_and_save_result(self, index, time):
    from models.pgportfolio.trade import backtest

    dataframe = None
    print(os.getcwd())
    csv_dir = os.path.join("models", "train_package", "train_summary.csv")
    ##csv_dir = "./train_package/train_summary.csv"
    # tflearn.is_training(False, self._agent.session)
    v_pv, v_log_mean, benefit_array, v_log_mean_free = self._evaluate("test", self._agent.portfolio_value, self._agent.log_mean, self._agent.pv_vector,
                                                                      self._agent.log_mean_free)

    backtest = backtest.BackTest(self.config.copy(), net_dir=None, agent=self._agent)

    backtest.start_trading()
    result = Result(
        test_pv=[v_pv],
        test_log_mean=[v_log_mean],
        test_log_mean_free=[v_log_mean_free],
        test_history=["".join(str(e) + ", " for e in benefit_array)],
        config=[json.dumps(self.config)],
        net_dir=[index],
        backtest_test_pv=[backtest.test_pv],
        backtest_test_history=["".join(str(e) + ", " for e in backtest.test_pc_vector)],
        backtest_test_log_mean=[np.mean(np.log(backtest.test_pc_vector))],
        training_time=int(time),
    )
    new_data_frame = pd.DataFrame(result._asdict()).set_index("net_dir")

    self._save_results_to_db(new_data_frame)

    if os.path.isfile(csv_dir):
      dataframe = pd.read_csv(csv_dir).set_index("net_dir")
      dataframe = dataframe.append(new_data_frame)
    else:
      dataframe = new_data_frame
    if int(index) > 0:
      dataframe.to_csv(csv_dir)
    return result

  def _save_results_to_db(self, results_df: pd.DataFrame) -> None:
    """save the results of this training session

    The input results named tuple contains the PV/mean return and historical returns for test/backtest for training period

    Information from the config including the start/end window/coin info etc will be stored along with the results

    Args:
        collections (_type_): the main results from training
    """

    # enrich the results_df with config info
    self.config
    self.train_config
    self.input_config
    self.save_path
    results_df
    print(results_df)
    print(results_df.index)
    save_df = results_df.copy()

    # copy the training results to save_model_dir
    key: str = datetime.now(tz).strftime("%Y%m%d%H%M%S")

    src_dir: str = Path(self.save_path).parent.parent
    for filename in os.listdir(src_dir):
      if os.path.isdir(os.path.join(src_dir, filename)):
        dest_dir: str = os.path.join('models', 'saved_models', f'{key}_{filename}')
        copy_src_dir: str = os.path.join(src_dir, filename)
        shutil.copytree(copy_src_dir, dest_dir, dirs_exist_ok=True)

    idxs = []
    for idx, row in save_df.iterrows():
      print(f'idx: {idx}')
      sub_key: str = f'{key}_{idx}'
      idxs.append(sub_key)
      save_df.loc[idx, "key"] = sub_key
      save_df.loc[idx, "stored_path"] = str(os.path.join('models', 'saved_models', sub_key))

    save_df["input_window_size"] = self.input_config["window_size"]
    save_df["input_coin_number"] = self.input_config["coin_number"]
    save_df["input_global_period"] = self.input_config["global_period"]
    save_df["input_feature_number"] = self.input_config["feature_number"]
    save_df["input_test_portion"] = self.input_config["test_portion"]
    save_df["input_online"] = self.input_config["online"]
    save_df["input_start_date"] = self.input_config["start_date"]
    save_df["input_end_date"] = self.input_config["end_date"]
    save_df["input_start_of_test_date"] = self.input_config["start_of_test_date"]
    save_df["input_volume_average_days"] = self.input_config["volume_average_days"]
    save_df["input_portion_reversed"] = self.input_config["portion_reversed"]
    save_df["input_data_provider"] = self.input_config["data_provider"]
    save_df["input_norm_method"] = self.input_config["norm_method"]
    save_df["input_is_permed"] = self.input_config["is_permed"]
    save_df["input_fake_ratio"] = self.input_config["fake_ratio"]
    save_df["input_fake_data"] = self.input_config["fake_data"]

    #save_df["training_method"] = self.train_config["method"]
    save_df["training_nn_agent_name"] = self.train_config["nn_agent_name"]
    save_df["training_loss_function"] = self.train_config["loss_function"]
    save_df["training_fast_train"] = self.train_config["fast_train"]
    save_df["training_num_epochs"] = self.train_config["steps"]
    save_df["training_buffer_biased"] = self.train_config["buffer_biased"]
    save_df["training_learning_rate"] = self.train_config["learning_rate"]
    save_df["training_batch_size"] = self.train_config["batch_size"]
    save_df["training_snapshot"] = self.train_config["snap_shot"]
    save_df["training_decay_rate"] = self.train_config["decay_rate"]
    save_df["training_decay_steps"] = self.train_config["decay_steps"]

    db = SqliteDataDB()
    db.insert_data_frame(save_df, 'Training_Results', if_exists='append')
