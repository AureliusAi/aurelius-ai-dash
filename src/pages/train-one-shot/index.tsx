import DownloadIcon from "@mui/icons-material/Download";
import DateAdapter from "@mui/lab/AdapterDateFns";
import DatePicker from "@mui/lab/DatePicker";
import LoadingButton from "@mui/lab/LoadingButton";
import LocalizationProvider from "@mui/lab/LocalizationProvider";
import { Button, Divider, InputLabel } from "@mui/material";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import OutlinedInput from "@mui/material/OutlinedInput";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import { useTheme } from "@mui/material/styles";
import TextareaAutosize from "@mui/material/TextareaAutosize";
import TextField from "@mui/material/TextField";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import React, { ChangeEvent, useEffect, useLayoutEffect, useState } from "react";
import { API_CONFIG_ENDPOINT, API_TRAINING_ENDPOINT } from "../../endpoints";
import { disconnectLogSocket, initiateLogSocket, subscribeToLog } from "../../page-components/log_sockets";
import PageHeader, { H2Title } from "../../page-components/PageHeader";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const fifo:Array<string> = [];

export default function TrainOneShot() {
  const theme = useTheme();

  // Status related variables
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);
  const [nnNotSetError, setNnNotSetError] = useState<string | null>(null);

  const [isTrainingRunning, setTrainingRunning] = useState<boolean>(false);
  const [trainingError, setTrainingError] = useState<string | null>(null);
  const [trainingStatus, setTrainingStatus] = useState<string | null>(null);

  // Training Input variables
  const [startTrainDate, setStartTrainDate] = useState<Date | null>(new Date());
  const [endTrainDate, setEndTrainDate] = useState<Date | null>(new Date());
  const [coinNumber, setCoinNumber] = useState<number>(11);
  const [processes, setProcesses] = useState<string>("1");
  const [device, setDevice] = useState<string>("CPU");
  const [numberEpochs, setNumberEpochs] = useState<number>(80000);
  const [globalPeriod, setGlobalPeriod] = useState<string>("1800");
  const [windowSize, setWindowSize] = useState<number>(50);
  const [volumeAverageDays, setVolumeAverageDays] = useState<number>(30);
  const [testPortion, setTestPortion] = useState<number>(8);
  const [numberOfFeatures, setNumberOfFeatures] = useState<number>(3);
  const [dataProvider, setDataProvider] = useState<string>("POLONIEX");
  const [availNNs, setAvailNNs] = useState<string[] | null>(null);
  const [retrieveNNError, setRetrieveNNError] = useState<string | null>(null);
  const [retrievingNNsRunning, setRetrievingNNsRunning] = useState<boolean>(false);
  const [nnToGet, setNNToGet] = useState<string>("");
  const [trainingStatusMsg, setTrainingStatusMsg] = useState<string | null>(null);

  const [deleteExistingRuns, setDeleteExistingRuns] = React.useState(true);

  // streaming log related
  const [logType, setLogType] = useState<string>("TRAINING");
  const [logData, setLogData] = useState<Array<string>>(fifo);
  const [logDataStr, setLogDataStr] = useState<string>("");

  const node = document.querySelectorAll('#logterminal')[0];

  useLayoutEffect(() => {
    const PAST_DATE = new Date();
    PAST_DATE.setMonth(PAST_DATE.getMonth() - 1);
    setStartTrainDate(PAST_DATE);
  }, []);

  useLayoutEffect(() => {
    get_list_of_avail_nns();
  }, []);

  useEffect(() => {
    checkDateDiff();
  }, [startTrainDate, endTrainDate]);

  // useEffect(() => {
  //   checkDateDiff();
  // }, [nnNotSetError]);

  useEffect(() => {
    console.log('isTrainingRunning:' + isTrainingRunning)
    if (isTrainingRunning === true) {
      if (logType) initiateLogSocket(logType);
      console.log("initing log")

      subscribeToLog((err: string, data: string) => {
        if (err) return;
        console.log("LOG STREAM: " + data)
        // setLogDataStr(logDataStr + "\n" + data);
        fifo.push(data)
        //setLogData((oldLogs: Array<string>) => [...oldLogs, data + "\n"]);
        if(fifo.length > 10000) {
          const ssss = fifo.shift()
          console.log('shifting!!!!!')
          console.log(ssss)
        }
        setLogDataStr(fifo.join("<br />"));
        node.innerHTML = fifo.join("<br />")
        // setLogData(fifo)
      });
      return () => {
        disconnectLogSocket();
      };
    }
  }, [isTrainingRunning]);

  const get_list_of_avail_nns = () => {
    setRetrieveNNError(null);
    setRetrievingNNsRunning(true);
    fetch(`${API_CONFIG_ENDPOINT}/nn/get-names-list`)
      .then((res) => res.json())
      .then(
        (result) => {
          setAvailNNs(result["nn_list"]);
          console.log(result["nn_list"]);
          setRetrievingNNsRunning(false);
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          setRetrieveNNError(error);
        }
      )
      .finally(() => {
        setRetrievingNNsRunning(false);
      });
  };

  function get_training_start_date() {
    let startdtstr = "";
    if (startTrainDate !== null) {
      startdtstr = startTrainDate.toISOString().split("T")[0];
    }
    return startdtstr;
  }

  function get_training_end_date() {
    let enddtstr = "";
    if (endTrainDate !== null) {
      enddtstr = endTrainDate.toISOString().split("T")[0];
    }
    return enddtstr;
  }

  function checkDateDiff() {
    /**
     * Computes the number of months (with fraction) between start and end date
     */
    let startdtstr = get_training_start_date();
    let enddtstr = get_training_end_date();

    let num_days_diff = checkNumDaysBetweenYYYYMMDD(enddtstr, startdtstr);
    if (num_days_diff < 1.0) {
      setDateRangeError("Must be at least 1 month between Start and End Training dates");
    } else {
      setDateRangeError(null);
    }
  }

  function checkNumDaysBetweenYYYYMMDD(enddtstr: string, startdtstr: string): number {
    const enddt = new Date(Date.parse(enddtstr));
    const startdt = new Date(Date.parse(startdtstr));

    let month_difference =
      (enddt.getDate() - startdt.getDate()) / 30 + enddt.getMonth() - startdt.getMonth() + 12 * (enddt.getFullYear() - startdt.getFullYear());
    return month_difference;
  }

  const kick_off_training = (startdtstr: string, enddtstr: string) => {
    const trainOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coinnum: coinNumber,
        starttrainingdate: startdtstr,
        endtrainingdate: enddtstr,
        numprocesses: parseInt(processes),
        deleteExistingRuns: deleteExistingRuns,
        device: device,
        numberepochs: numberEpochs,
        globalperiod: globalPeriod,
        windowsize: windowSize,
        volumeaveragedays: volumeAverageDays,
        testportion: testPortion / 100.0,
        numberfeatures: numberOfFeatures,
        dataprovider: dataProvider,
        nn: nnToGet,
      }),
    };
    setTrainingError(null);
    setTrainingRunning(true);
    fetch(`${API_TRAINING_ENDPOINT}/train-one-shot`, trainOptions)
      .then((res) => res.json())
      .then(
        (result) => {
          console.log(result);
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          setTrainingError(error);
        }
      )
      .finally(() => {
        setTrainingRunning(false);
        setTrainingStatusMsg(null);
      });
  };

  function onRunOneShotTraining(event: React.MouseEvent) {
    setTrainingStatusMsg(null);
    setLogDataStr("")
    setLogData([]);

    // check we have all the input params set

    // 1. check the NN is selected
    if (!nnToGet) {
      setNnNotSetError("Please select a Neural Network to run");
      return;
    }

    // 2. check the date between start and end is at least 1 month
    let startdtstr: string = get_training_start_date();
    let enddtstr: string = get_training_end_date();
    let num_days_diff = checkNumDaysBetweenYYYYMMDD(enddtstr, startdtstr);
    if (num_days_diff <= 0) {
      setDateRangeError("Must be at least 1 month between Start and End Training dates");
      return;
    }

    setTrainingStatusMsg("Training Kicked off!");
    kick_off_training(startdtstr, enddtstr);
  }

  const handleProcessNumberChange = (event: SelectChangeEvent) => {
    setProcesses(event.target.value);
  };

  const handleDataProviderChange = (event: SelectChangeEvent) => {
    setDataProvider(event.target.value);
  };

  const handleGlobalPeriodChange = (event: SelectChangeEvent) => {
    setGlobalPeriod(event.target.value);
  };

  const handleDeviceTypeChange = (event: SelectChangeEvent) => {
    setDevice(event.target.value);
  };

  const handleNNSelectionChanged = (event: SelectChangeEvent<typeof nnToGet>) => {
    const {
      target: { value },
    } = event;
    setNNToGet(value);
    if (value) {
      console.log("setting NN value to: " + value);
      setNnNotSetError(null);
    } else {
      setNnNotSetError("Please select a Neural Network to run");
    }
  };

  const onClearConsole = (event: any) => {
    setLogData([]);
    setLogDataStr("");
  };

  return (
    <Box>
      <PageHeader>Train One Shot</PageHeader>
      <Box pb={4} sx={{ color: theme.palette.text.secondary }}>
        Train portfolio on historic data given a start date, end date, number of coins and other parameters
      </Box>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Box>
          <LocalizationProvider dateAdapter={DateAdapter}>
            <DatePicker
              label="Start Train Date"
              inputFormat="yyyy-MM-dd"
              mask="____-__-__"
              value={startTrainDate}
              onChange={(date: Date | null) => {
                setStartTrainDate(date);
              }}
              renderInput={(params) => <TextField sx={{ width: "150px" }} {...params} />}
            />
          </LocalizationProvider>
        </Box>
        <Box ml={2}>
          <LocalizationProvider dateAdapter={DateAdapter}>
            <DatePicker
              label="End Train Date"
              inputFormat="yyyy-MM-dd"
              mask="____-__-__"
              value={endTrainDate}
              onChange={(date: Date | null) => {
                setEndTrainDate(date);
              }}
              renderInput={(params) => <TextField sx={{ width: "150px" }} {...params} />}
            />
          </LocalizationProvider>
        </Box>
        <Box ml={2}>
          <TextField
            id="coin-number"
            label="Number of Coins"
            type="number"
            value={coinNumber}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setCoinNumber(parseInt(e.target.value));
            }}
            sx={{ width: "110px" }}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Box>
        <FormControl sx={{ minWidth: 110, marginLeft: 2, marginRight: 3 }}>
          <InputLabel id="data-provider-label">Data Provicer</InputLabel>
          <Select
            value={dataProvider}
            id="data-provider-label"
            onChange={handleDataProviderChange}
            displayEmpty
            autoWidth
            label="Global Period"
            inputProps={{ "aria-label": "The data provider to use" }}
          >
            <MenuItem value="POLONIEX">POLONIEX</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Divider light={true} sx={{ mt: 1.5, mb: 0.5, mx: 0 }} />

      <Box mt={2} mb={2} display="Flex" sx={{ alignContent: "center", alignItems: "center" }}>
        <FormControl sx={{ minWidth: 110 }}>
          <InputLabel id="num-processes-select-label"># of Processes</InputLabel>
          <Select
            value={processes}
            labelId="num-processes-select-label"
            onChange={handleProcessNumberChange}
            displayEmpty
            label="# of Processes"
            inputProps={{ "aria-label": "number of processes you want to start to train the network" }}
          >
            <MenuItem value="1">1</MenuItem>
            <MenuItem value="2">2</MenuItem>
            <MenuItem value="3">3</MenuItem>
            <MenuItem value="3">4</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 110, marginLeft: 2 }}>
          <InputLabel id="device-select-label">Device Type</InputLabel>
          <Select
            value={device}
            label="Device Type"
            labelId="device-select-label"
            onChange={handleDeviceTypeChange}
            displayEmpty
            inputProps={{ "aria-label": " device to be used to train" }}
          >
            <MenuItem value="CPU">
              <em>CPU</em>
            </MenuItem>
            <MenuItem value="GPU">
              <em>GPU</em>
            </MenuItem>
          </Select>
        </FormControl>

        <Box ml={2}>
          <FormControl sx={{ width: 235 }}>
            <InputLabel id="demo-multiple-checkbox-label">Select Neural Network</InputLabel>
            <Select
              labelId="demo-multiple-checkbox-label"
              id="demo-multiple-checkbox"
              value={nnToGet}
              onChange={handleNNSelectionChanged}
              input={<OutlinedInput label="Tag" />}
              renderValue={(selected) => selected}
              MenuProps={MenuProps}
            >
              {availNNs &&
                availNNs.map((nn) => (
                  <MenuItem key={nn} value={nn}>
                    <ListItemText primary={nn} />
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </Box>

        <FormControlLabel
          sx={{ marginLeft: 2 }}
          control={
            <Checkbox
              checked={deleteExistingRuns}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setDeleteExistingRuns(event.target.checked);
              }}
              inputProps={{ "aria-label": "controlled" }}
            />
          }
          label="Delete Prev Training Data"
        />

        <Box ml={2}>
          {nnNotSetError && <Box sx={{ color: "#FF3333" }}>{nnNotSetError}</Box>}
          {dateRangeError && <Box sx={{ color: "#FF3333" }}>{dateRangeError}</Box>}
          {dateRangeError == null && nnNotSetError == null && (
            <Box>
              <Box sx={{ alignItems: "center" }} display="flex">
                <LoadingButton loading={isTrainingRunning} onClick={onRunOneShotTraining} variant="contained">
                  Train One Shot
                </LoadingButton>

                {trainingError ? (
                  <Box sx={{ color: "#FF3333" }} ml={2}>
                    {trainingError}
                  </Box>
                ) : (
                  <span />
                )}
                {trainingStatus ? (
                  <Box sx={{ color: "#35a660" }} ml={2}>
                    {trainingStatus}
                  </Box>
                ) : (
                  <span />
                )}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
      <Box mt={0} display="Flex" sx={{ alignContent: "center", alignItems: "center" }}>
        <Box>
          <TextField
            id="num-epochs"
            label="# Epochs"
            type="number"
            value={numberEpochs}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setNumberEpochs(parseInt(e.target.value));
            }}
            sx={{ width: "110px" }}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Box>
        <FormControl sx={{ minWidth: 110, marginLeft: 2 }}>
          <InputLabel id="global-period-select-label">Global Period</InputLabel>
          <Select
            value={globalPeriod}
            id="global-period-select-label"
            onChange={handleProcessNumberChange}
            displayEmpty
            autoWidth
            label="Global Period"
            inputProps={{ "aria-label": "The period on which to train the model" }}
          >
            <MenuItem value="60">1 min</MenuItem>
            <MenuItem value="300">5 mins</MenuItem>
            <MenuItem value="600">10 mins</MenuItem>
            <MenuItem value="900">15 mins</MenuItem>
            <MenuItem value="1800">30 mins</MenuItem>
            <MenuItem value="3600">1 hour</MenuItem>
            <MenuItem value="14400">4 hours</MenuItem>
            <MenuItem value="86400">1 day</MenuItem>
          </Select>
        </FormControl>
        <Box>
          <TextField
            id="window-size"
            label="Window Size"
            type="number"
            value={windowSize}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setWindowSize(parseInt(e.target.value));
            }}
            sx={{ width: "110px", marginLeft: 2 }}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Box>
        <Box>
          <TextField
            id="vol-average-days"
            label="Volume Avg Days"
            type="number"
            value={volumeAverageDays}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setVolumeAverageDays(parseInt(e.target.value));
            }}
            sx={{ width: "110px", marginLeft: 2 }}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Box>
        <Box>
          <TextField
            id="test-portion"
            label="Test Portion (%)"
            type="number"
            InputProps={{
              inputProps: {
                min: 1,
                max: 100,
                step: 1,
              },
            }}
            value={testPortion}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setTestPortion(parseInt(e.target.value));
            }}
            sx={{ width: "110px", marginLeft: 2 }}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Box>
        <Box>
          <TextField
            id="number-features"
            label="Number Features"
            type="number"
            InputProps={{
              inputProps: {
                min: 1,
                max: 3,
                step: 1,
              },
            }}
            value={numberOfFeatures}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setNumberOfFeatures(parseInt(e.target.value));
            }}
            sx={{ width: "110px", marginLeft: 2 }}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Box>
        <Box ml={2}>{trainingStatusMsg ? trainingStatusMsg : <span />}</Box>
      </Box>
      <Box mt={2}>
        <Box display="flex" sx={{ justifyContent: "space-between" }}>
          <Box>
            <H2Title>Training Log Console</H2Title>
          </Box>
          <Box>
            <Button color="error" onClick={onClearConsole} startIcon={<DeleteForeverIcon />}>
              Clear Console
            </Button>
          </Box>
        </Box>
        <Box id={'logterminal'} sx={{ border: "1px #CCCCCC solid", width: "100%", height: "calc(100vh - 480px)", resize: "vertical", overflow: "auto" }}>
        {logDataStr}
        </Box>

        {/* <TextareaAutosize
          value={logData}
          maxRows={100000}
          aria-label="minimum height"
          minRows={20}
          placeholder="Training Logs"
          style={{ width: "100%", height: "calc(100vh - 480px)", resize: "vertical", overflow: "auto" }}
        /> */}
      </Box>
    </Box>
  );
}
