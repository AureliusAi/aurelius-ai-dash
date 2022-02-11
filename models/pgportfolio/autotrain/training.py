from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import logging
import os
import time
from multiprocessing import Process
from models.pgportfolio.learn.tradertrainer import TraderTrainer
from models.pgportfolio.tools.configprocess import load_config


def train_one(save_path:str, config:str, log_file_dir:str, index:str, logfile_level:int, console_level:int, device:str):
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
    if log_file_dir:
        logging.basicConfig(filename=log_file_dir.replace("tensorboard","programlog"), level=logfile_level)
        console = logging.StreamHandler()
        console.setLevel(console_level)
        logging.getLogger().addHandler(console)
    print("training at %s started" % index)
    return TraderTrainer(config, save_path=save_path, device=device).train_net(log_file_dir=log_file_dir, index=index)


def train_all(config:dict, processes:int=1, device:str="cpu"):
    """

    Train all the agents in the train_package folders
 
    Args:
        config (dict): object containing the training input parameters for the training session
        processes (int, optional): The number of the processes. If equal to 1, the logging level is debug
                      at file and info at console. If greater than 1, the logging level is
                      info at file and warning at console.
        device (str, optional): options are 1) 'cpu' - default 2) 'gpu'. The device to run the training on.
        
    """
    
    train_dir = os.path.join("models","train_package")
    package_dir = os.path.join(os.getcwd(), train_dir)

    if processes == 1:
        console_level = logging.INFO
        logfile_level = logging.DEBUG
    else:
        console_level = logging.WARNING
        logfile_level = logging.INFO
    train_dir = "train_package"
    if not os.path.exists(package_dir): #if the directory does not exist, creates one
        os.makedirs(package_dir)
    all_subdir = os.listdir(package_dir)
    all_subdir.sort()
    pool = []
    status_msg = ''
    for dir in all_subdir:
        # train only if the dir is numeric
        logging.info(f'processing dir: {dir}')
        if not str.isdigit(dir):
            logging.info(f'dir [{dir}] is not numeric')
            return
        # NOTE: logfile is for compatibility reason. 
        # We dont need to train if already trained.
        if not (os.path.isdir(os.path.join(package_dir,dir,"tensorboard")) or os.path.isdir(os.path.join(package_dir,dir,"logfile"))):
            p = Process(target=train_one, args=(
                os.path.join(package_dir,dir,"netfile"),
                config,
                os.path.join(package_dir,dir,"tensorboard"),
                dir, logfile_level, console_level, device))
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
            if len(pool)<processes:
                wait = False
    print("All the Tasks are Over")

    return("OK", (status_msg if status_msg == '' else "All the Tasks are Over" ))
