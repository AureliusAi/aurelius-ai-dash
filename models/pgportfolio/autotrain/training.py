from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os
import time
from multiprocessing import Process, Queue
from models.pgportfolio.learn.tradertrainer import TraderTrainer
from models.pgportfolio.tools.configprocess import load_config
import logging
from common.custom_logger2 import get_custom_logger, get_custom_training_logger, global_training_queue

logger = get_custom_logger(__name__)
training_logger = get_custom_training_logger(__name__)


def train_one(save_path: str, config: str, log_file_dir: str, index: str, logfile_level: int, console_level: int, device: str, logging_q: Queue):
  """

    train an agent

    Args:
        save_path (str): the path to save the tensorflow model (.ckpt), could be None
        config (str): the json configuration file
        log_file_dir (str): the directory to save the tensorboard logging file, could be None
        index (str): identifier of this train, which is also the sub directory in the train_package, if it is 0. nothing would be saved into the summary file.
        logfile_level (int): logging level of the file
        console_level (int): logging level of the console
        device (str):  'cpu' or 'gpu' 

    Returns:
        [type]: the Result namedtuple
    """
  #   if log_file_dir:
  #     logging.basicConfig(filename=log_file_dir.replace("tensorboard", "programlog"), level=logfile_level)
  #     console = logging.StreamHandler()
  #     console.setLevel(console_level)
  #     logging.getLogger().addHandler(console)
  # training_logger = get_custom_training_logger(__name__)
  logger.info("logger %s started" % index)

  logger.info("logger: RUNNING IN PROCESS!!!!!")
  # training_logger.info("training_logger: RUNNING IN PROCESS!!!!!")
  # training_logger.info("logger %s started" % index)

  TraderTrainer(config, save_path=save_path, device=device, logging_q=logging_q).train_net(log_file_dir=log_file_dir, index=index)

  logger.info("Training complete")


def train_all(config: dict, processes: int = 1, device: str = "cpu"):
  """

    Train all the agents in the train_package folders
 
    Args:
        config (dict): object containing the training input parameters for the training session
        processes (int, optional): The number of the processes. If equal to 1, the logging level is debug
                      at file and info at console. If greater than 1, the logging level is
                      info at file and warning at console.
        device (str, optional): options are 1) 'cpu' - default 2) 'gpu'. The device to run the training on.
        
    """

  train_dir = os.path.join("models", "train_package")
  package_dir = os.path.join(os.getcwd(), train_dir)

  if processes == 1:
    console_level = logger.setLevel(logging.INFO)
    logfile_level = logger.setLevel(logging.DEBUG)
  else:
    console_level = logger.setLevel(logging.WARNING)
    logfile_level = logger.setLevel(logging.INFO)
  train_dir = "train_package"
  if not os.path.exists(package_dir):  #if the directory does not exist, creates one
    os.makedirs(package_dir)
  all_subdir = os.listdir(package_dir)
  all_subdir.sort()
  pool = []
  status_msg = ''
  for dir in all_subdir:
    if os.path.isdir(os.path.join(package_dir, dir)) == False:  #i.e. if the dir is not actually a dir
      continue
    # train only if the dir is numeric
    logger.info(f'processing dir: {dir}')
    if not str.isdigit(dir):
      logger.info(f'dir [{dir}] is not numeric')
      return
    # NOTE: logfile is for compatibility reason.
    # We dont need to train if already trained.
    if not (os.path.isdir(os.path.join(package_dir, dir, "tensorboard")) or os.path.isdir(os.path.join(package_dir, dir, "logfile"))):
      p = Process(
          target=train_one,
          args=(os.path.join(package_dir, dir,
                             "netfile"), config, os.path.join(package_dir, dir,
                                                              "tensorboard"), dir, logfile_level, console_level, device, global_training_queue),
      )
      p.start()
      pool.append(p)
    else:
      status_msg += f'training package: {dir} already trained. skipping <br />'
      continue

    # suspend if the processes are too many
    wait = True
    while wait:
      time.sleep(5)
      for p in pool:
        alive = p.is_alive()
        if not alive:
          pool.remove(p)
      if len(pool) < processes:
        wait = False
  print("All the Tasks are Over")

  return ("OK", (status_msg if status_msg == '' else "All the Tasks are Over"))
