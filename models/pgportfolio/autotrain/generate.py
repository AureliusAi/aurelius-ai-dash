from __future__ import print_function, absolute_import, division
import json
import os
import logging
from os import path
import shutil

train_dir = "train_package"

def cleanup_training_packages(config:dict)->None:
    """

    Deletes all training_package subfolders

    Args:
        config (dict): the config
    """
    
    package_dir = os.path.join(os.getcwd(), train_dir)
    all_subdir_paths = [os.path.join(package_dir,s) for s in os.listdir(package_dir) if os.path.isdir(os.path.join(package_dir,s) )]
    for subdir in all_subdir_paths:
        logging.info(f"Deleting training folder: {subdir}")
        shutil.rmtree(subdir)

def add_packages(config:dict, repeat:int=1)->list:
    """[
        
    Creates a new folder for training under training_packages.
    Each folder contains it's own copy of the config and has its 
    own random seed set to distinguish it from other packages

    Args:
        config (dict): the config
        repeat (int, optional): the number of subfolders to create. Defaults to 1.

    Returns:
        list: list of all subfolder indicies (each folder name is just a number)
    """
    
    package_dir = os.path.join(os.getcwd(), train_dir)
    all_subdir = [int(s) for s in os.listdir(package_dir) if os.path.isdir(package_dir+"/"+s)]
    if all_subdir:
        max_dir_num = max(all_subdir)
    else:
        max_dir_num = 0
    indexes = []

    for i in range(repeat):
        max_dir_num += 1
        directory = package_dir+"/"+str(max_dir_num)
        config["random_seed"] = i
        os.makedirs(directory)
        indexes.append(max_dir_num)
        with open(directory + "/" + "net_config.json", 'w') as outfile:
            json.dump(config, outfile, indent=4, sort_keys=True)
    logging.info("create indexes %s" % indexes)
    return indexes

