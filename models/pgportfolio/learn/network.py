#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import absolute_import
from __future__ import division

import logging

import tensorflow.compat.v1 as tf

tf.disable_v2_behavior()

# from tensorflow import keras
# from tensorflow.keras import layers

import tensorflow_docs as tfdocs
import tensorflow_docs.modeling
import tensorflow_docs.plots

#import tflearn




class NeuralNetWork:
    def __init__(self, feature_number, rows, columns, layers, device):

        # this destroys the current TF graph session and creates a brand-new one.
        tf.keras.backend.clear_session()

        # TF1 specific GPU throttleing functionality
        # --------------------------------------------------------------------------------------
        tf_config = tf.ConfigProto()
        self.session = tf.Session(config=tf_config)
        if device == "cpu":
            tf_config.gpu_options.per_process_gpu_memory_fraction = 0
        else:
            tf_config.gpu_options.per_process_gpu_memory_fraction = 0.2
        # --------------------------------------------------------------------------------------

        # https://www.tensorflow.org/guide/gpu
        # Limiting GPU memory growth
        # By default, TensorFlow maps nearly all of the GPU memory of all GPUs (subject to CUDA_VISIBLE_DEVICES) visible to the process. 
        # This is done to more efficiently use the relatively precious GPU memory resources on the devices by reducing memory fragmentation. 
        # To limit TensorFlow to a specific set of GPUs, use the tf.config.set_visible_devices method.
        #
        # In some cases it is desirable for the process to only allocate a subset of the available memory, or to only grow the memory usage 
        # as is needed by the process. TensorFlow provides two methods to control this.
        # 
        # The first option is to turn on memory growth by calling tf.config.experimental.set_memory_growth, which attempts to allocate only 
        # as much GPU memory as needed for the runtime allocations: it starts out allocating very little memory, and as the program gets run 
        # and more GPU memory is needed, the GPU memory region is extended for the TensorFlow process. Memory is not released since it can 
        # lead to memory fragmentation. To turn on memory growth for a specific GPU, use the following code prior to allocating any tensors 
        # or executing any ops.
        #
        # Another way to enable this option is to set the environmental variable TF_FORCE_GPU_ALLOW_GROWTH to true. This configuration is 
        # platform specific.
        #
        # The second method is to configure a virtual GPU device with tf.config.set_logical_device_configuration and set a hard limit on the 
        # total memory to allocate on the GPU.

        # attempt to convert to TF2
        # if device == "gpu":
        #     gpus = tf.config.list_physical_devices('GPU')
        #     if gpus:
        #         try:
        #             # Currently, memory growth needs to be the same across GPUs
        #             for gpu in gpus:
        #                 tf.config.experimental.set_memory_growth(gpu, True)
        #             logical_gpus = tf.config.list_logical_devices('GPU')
        #             print(len(gpus), "Physical GPUs,", len(logical_gpus), "Logical GPUs")
        #         except RuntimeError as e:
        #             # Memory growth must be set before GPUs have been initialized
        #             print(e)


        self.input_num = tf.placeholder(tf.int32, shape=[])
        # self.input_num = tf.keras.Input(shape=[], dtype=tf.dtypes.int32)
        
        self.input_tensor = tf.placeholder(tf.float32, shape=[None, feature_number, rows, columns])
        #self.input_tensor = tf.keras.Input(shape=[None, feature_number, rows, columns], dtype=tf.dtypes.float32)

        self.previous_w = tf.placeholder(tf.float32, shape=[None, rows])
        #self.previous_w = tf.keras.Input(shape=[None, rows], dtype=tf.dtypes.float32)
        
        self._rows = rows
        self._columns = columns

        self.layers_dict = {}
        self.layer_count = 0

        self.output = self._build_network(layers)

    def _build_network(self, layers):
        pass


class CNN(NeuralNetWork):
    # input_shape (features, rows, columns)
    def __init__(self, feature_number, rows, columns, layers, device):
        NeuralNetWork.__init__(self, feature_number, rows, columns, layers, device)

    def add_layer_to_dict(self, layer_type, tensor, weights=True):

        self.layers_dict[layer_type + '_' + str(self.layer_count) + '_activation'] = tensor
        self.layer_count += 1

    # grenerate the operation, the forward computaion
    def _build_network(self, layers):
        
        network = tf.transpose(self.input_tensor, [0, 2, 3, 1])

        # [batch, assets, window, features]
        network = network / network[:, :, -1, 0, None, None]
        for layer_number, layer in enumerate(layers):

            logging.info(layer)
            
            regularizer = None
            if 'regularizer' in layer:
                reg_type = layer["regularizer"]
            
                if reg_type == 'L2':
                    regularizer = tf.keras.regularizers.l2
                elif reg_type == 'L1':
                    regularizer = tf.keras.regularizers.l1
                elif reg_type == 'L1L2':
                    regularizer = tf.keras.regularizers.l1_l2

            if layer["type"] == "DenseLayer":
                network = tf.keras.layers.Dense(
                        int(layer["neuron_number"]),    # number of neurons
                        activation=layer["activation_function"],
                        kernel_regularizer=regularizer(layer["weight_decay"]) if regularizer != None else None
                    ) (network)

                #network = tflearn.layers.core.fully_connected(network, int(layer["neuron_number"]), layer["activation_function"], regularizer=layer["regularizer"], weight_decay=layer["weight_decay"] )
                self.add_layer_to_dict(layer["type"], network)

            elif layer["type"] == "DropOut":
                network = tf.keras.layers.Dropout(layer["keep_probability"]) (network)
                #network = tflearn.layers.core.dropout(network, layer["keep_probability"])

            elif layer["type"] == "EIIE_Dense":
                width = network.get_shape()[2]
                #network = tflearn.layers.conv_2d(network, int(layer["filter_number"]), [1, width], [1, 1], "valid", layer["activation_function"], regularizer=layer["regularizer"], weight_decay=layer["weight_decay"])
                network = tf.keras.layers.Conv2D(
                            int(layer["filter_number"]), # # filters
                            (1, width),                  # kernel size
                            strides=(1, 1),              # strides
                            padding="valid",             # padding 
                            activation=layer["activation_function"], 
                            kernel_regularizer=regularizer(layer["weight_decay"]) if regularizer != None else None 
                        )(network)
                self.add_layer_to_dict(layer["type"], network)

            elif layer["type"] == "ConvLayer":
                #network = tflearn.layers.conv_2d(network, int(layer["filter_number"]), allint(layer["filter_shape"]), allint(layer["strides"]), layer["padding"], layer["activation_function"], regularizer=layer["regularizer"], weight_decay=layer["weight_decay"])
                network = tf.keras.layers.Conv2D(
                            int(layer["filter_number"]),        # number of filters
                            allint(layer["filter_shape"]),      # kernel size
                            strides=allint(layer["strides"]),   # strides
                            padding=layer["padding"], 
                            activation=layer["activation_function"], 
                            kernel_regularizer=regularizer(layer["weight_decay"]) if regularizer != None else None 
                        )(network)
                self.add_layer_to_dict(layer["type"], network)
                pass

            elif layer["type"] == "MaxPooling":
                #network = tflearn.layers.conv.max_pool_2d(network, layer["strides"])
                pass

            elif layer["type"] == "AveragePooling":
                #network = tflearn.layers.conv.avg_pool_2d(network, layer["strides"])
                pass

            elif layer["type"] == "LocalResponseNormalization":
                #network = tflearn.layers.normalization.local_response_normalization(network)
                pass

            elif layer["type"] == "EIIE_Output":
                # width = network.get_shape()[2]
                # network = tflearn.layers.conv_2d(network, 1, [1, width], padding="valid", regularizer=layer["regularizer"], weight_decay=layer["weight_decay"])
                # self.add_layer_to_dict(layer["type"], network)
                # network = network[:, :, 0, 0]
                # btc_bias = tf.ones((self.input_num, 1))
                # self.add_layer_to_dict(layer["type"], network)
                # network = tf.concat([btc_bias, network], 1)
                # network = tflearn.layers.core.activation(network, activation="softmax")
                # self.add_layer_to_dict(layer["type"], network, weights=False)
                pass

            elif layer["type"] == "Output_WithW":
                # network = tflearn.flatten(network)
                # network = tf.concat([network,self.previous_w], axis=1)
                # network = tflearn.fully_connected(network, self._rows+1, activation="softmax", regularizer=layer["regularizer"], weight_decay=layer["weight_decay"])
                pass

            elif layer["type"] == "EIIE_Output_WithW":
                width = network.get_shape()[2]
                height = network.get_shape()[1]
                features = network.get_shape()[3]
                
                network = tf.reshape(network, [self.input_num, int(height), 1, int(width*features)])
                
                w = tf.reshape(self.previous_w, [-1, int(height), 1, 1])
                
                network = tf.concat([network, w], axis=3)
                #network = tflearn.layers.conv_2d(network, 1, [1, 1], padding="valid", regularizer=layer["regularizer"], weight_decay=layer["weight_decay"])
                network = tf.keras.layers.Conv2D(
                            1,                           # filters
                            (1, 1),                      # kernel size
                            strides=(1, 1),              # strides
                            padding="valid",             # padding 
                            activation='linear', 
                            kernel_regularizer=regularizer(layer["weight_decay"]) if regularizer != None else None 
                        )(network)
                
                self.add_layer_to_dict(layer["type"], network)
                
                network = network[:, :, 0, 0]
                #btc_bias = tf.zeros((self.input_num, 1))
                btc_bias = tf.Variable(tf.zeros(shape=[1, 1], dtype=tf.float32), name="btc_bias", dtype=tf.float32)
                # self.add_layer_to_dict(layer["type"], network, weights=False)
                btc_bias = tf.tile(btc_bias, [self.input_num, 1])
                network = tf.concat([btc_bias, network], 1)
                #self.voting = network  <-- not used
                self.add_layer_to_dict('voting', network, weights=False)
                #network = tflearn.layers.core.activation(network, activation="softmax")
                network = tf.keras.layers.Softmax(axis=-1)(network)
                self.add_layer_to_dict('softmax_layer', network, weights=False)

            # elif layer["type"] == "EIIE_LSTM" or\
            #                 layer["type"] == "EIIE_RNN":
            #     network = tf.transpose(network, [0, 2, 3, 1])
            #     resultlist = []
            #     reuse = False
            #     for i in range(self._rows):
            #         if i > 0:
            #             reuse = True
            #         if layer["type"] == "EIIE_LSTM":
            #             result = tflearn.layers.lstm(network[:, :, :, i],
            #                                          int(layer["neuron_number"]),
            #                                          dropout=layer["dropouts"],
            #                                          scope="lstm"+str(layer_number),
            #                                          reuse=reuse)
            #         else:
            #             result = tflearn.layers.simple_rnn(network[:, :, :, i],
            #                                                int(layer["neuron_number"]),
            #                                                dropout=layer["dropouts"],
            #                                                scope="rnn"+str(layer_number),
            #                                                reuse=reuse)
            #         resultlist.append(result)
            #     network = tf.stack(resultlist)
            #     network = tf.transpose(network, [1, 0, 2])
            #     network = tf.reshape(network, [-1, self._rows, 1, int(layer["neuron_number"])])
            # else:
            #     raise ValueError("the layer {} not supported.".format(layer["type"]))
        return network


def allint(l):
    return [int(i) for i in l]

