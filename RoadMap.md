# Aurelius Ai Dashboard Roadmap

## The next stages of Aurelius Ai: PGPortfolio

### 1. enhance the Train-One Shot UI add hyperparams and other params

Cannot fit all on main screen

- number of epochs
- the global period (30min 1hour, 5min etc)
- window size
- volume average days ( the number of days to average volume to get coins to trade )
- test portion
- number of features and which ones
- market data provider to use

Other hyper parameteres

- batch_size: 109,
- buffer_biased: 5e-05,
- decay_rate: 1.0,
- decay_steps: 50000,
- fast_train: true,
- learning_rate: 0.00028,
- loss_function: "loss_function6",
- snap_shot: false,
- steps: 80000, <-- number of epochs
- training_method: "Adam"

what are these?

- fake ratio
- save_memory_mode
- norm_method

**Need to add the NN (which needs to parameterized)**

---

### 2. better error communication with FO

### 3. should download data automatically if missing

### 4. After each training run

1. Save log
2. save model. Model names can be renamed
3. save metrics of training. How much money made and risk metrics

### 5. Create another tab for NNs and Models

1. NNs can be viewed/modified/added <== Need to add the ResNet version
2. Models can be viewed

### 6. the backtest tab will select a Model to backtest

1. Select model/models
2. Select algos to compare with

### 7. Auto Train (to some extent)

1. Train over wide range of date ranges
2. Train using different hyperparams
