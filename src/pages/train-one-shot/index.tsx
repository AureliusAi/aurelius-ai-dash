import DownloadIcon from "@mui/icons-material/Download";
import DateAdapter from "@mui/lab/AdapterDateFns";
import DatePicker from "@mui/lab/DatePicker";
import LoadingButton from "@mui/lab/LoadingButton";
import LocalizationProvider from "@mui/lab/LocalizationProvider";
import { Divider, InputLabel } from "@mui/material";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import { useTheme } from "@mui/material/styles";
import TextareaAutosize from "@mui/material/TextareaAutosize";
import TextField from "@mui/material/TextField";
import React, { ChangeEvent, useEffect, useLayoutEffect, useState } from "react";
import { API_TRAINING_ENDPOINT } from "../../endpoints";
import { disconnectLogSocket, initiateLogSocket, subscribeToLog } from "../../page-components/log_sockets";
import PageHeader, { H2Title } from "../../page-components/PageHeader";

export default function TrainOneShot() {
  const theme = useTheme();

  // Status related variables
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);

  const [isTrainingRunning, setTrainingRunning] = useState<boolean>(false);
  const [trainingError, setTrainingError] = useState<string | null>(null);
  const [trainingStatus, setTrainingStatus] = useState<string | null>(null);

  const [isDataDownloadRunning, setDataDownloadRunning] = useState<boolean>(false);
  const [dataDownloadingError, setDataDownloadingError] = useState<string | null>(null);
  const [dataDownloadStatus, setDataDownloadStatus] = useState<string | null>(null);

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
  const [dataProvider, setDataProvider] = useState<string>("POLONEX");

  const [deleteExistingRuns, setDeleteExistingRuns] = React.useState(true);

  // streaming log related
  const [logType, setLogType] = useState<string>("TRAINING");
  const [logData, setLogData] = useState<Array<string>>([]);

  useLayoutEffect(() => {
    const PAST_DATE = new Date();
    PAST_DATE.setMonth(PAST_DATE.getMonth() - 1);
    setStartTrainDate(PAST_DATE);
  }, []);

  useEffect(() => {
    checkDateDiff();
  }, [startTrainDate, endTrainDate]);

  useEffect(() => {
    if (logType) initiateLogSocket(logType);

    subscribeToLog((err: string, data: string) => {
      if (err) return;
      console.log(data);
      setLogData((oldLogs: Array<string>) => [data, ...oldLogs]);
      console.log(logData);
    });
    return () => {
      disconnectLogSocket();
    };
  }, [logType]);

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

  function onDownloadData(event: React.MouseEvent) {
    let startdtstr = get_training_start_date();
    let enddtstr = get_training_end_date();

    let num_days_diff = checkNumDaysBetweenYYYYMMDD(enddtstr, startdtstr);
    if (num_days_diff <= 0) {
      setDateRangeError("Must be at least 1 month between Start and End Training dates");
      return;
    }

    const dataDownloadOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coinnum: coinNumber,
        starttrainingdate: startdtstr,
        endtrainingdate: enddtstr,
      }),
    };

    setDataDownloadingError(null);
    setDataDownloadStatus(null);
    setDataDownloadRunning(true);
    fetch(`${API_TRAINING_ENDPOINT}/get-historical-data`, dataDownloadOptions)
      .then((res) => res.json())
      .then(
        (result) => {
          console.log(result);
          setDataDownloadStatus(result.status_msg);
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          setDataDownloadingError(error);
        }
      )
      .finally(() => {
        setDataDownloadRunning(false);
      });
  }

  function onRunOneShotTrainging(event: React.MouseEvent) {
    let startdtstr = get_training_start_date();
    let enddtstr = get_training_end_date();

    let num_days_diff = checkNumDaysBetweenYYYYMMDD(enddtstr, startdtstr);

    console.log("num_days_diff: " + num_days_diff);

    if (num_days_diff <= 0) {
      setDateRangeError("Must be at least 1 month between Start and End Training dates");
      return;
    }

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
      });
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
        <Box ml={2} mr={3}>
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
        <Box ml={2}>
          {dateRangeError ? (
            <span />
          ) : (
            <Box sx={{ alignItems: "center" }}>
              {isTrainingRunning ? (
                <span />
              ) : (
                <Box display="flex">
                  <LoadingButton startIcon={<DownloadIcon />} color="secondary" loading={isDataDownloadRunning} onClick={onDownloadData} variant="contained">
                    Historic Data
                  </LoadingButton>

                  {dataDownloadingError ? (
                    <Box sx={{ color: "#FF3333" }} ml={2}>
                      {dataDownloadingError}
                    </Box>
                  ) : (
                    <span />
                  )}
                  {dataDownloadStatus ? (
                    <Box sx={{ color: "#35a660" }} ml={2}>
                      {dataDownloadStatus}
                    </Box>
                  ) : (
                    <span />
                  )}
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>

      <Divider light={true} sx={{ mt: 1.5, mb: 0.5, mx: 0 }} />

      <Box mt={0} display="Flex" sx={{ alignContent: "center", alignItems: "center" }}>
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

        <Box ml={2} pb={3}>
          {dateRangeError ? (
            <Box sx={{ color: "#FF3333" }}>{dateRangeError}</Box>
          ) : (
            <Box>
              {isDataDownloadRunning ? (
                <span />
              ) : (
                <Box sx={{ alignItems: "center" }} display="flex" mt={2}>
                  <LoadingButton loading={isTrainingRunning} onClick={onRunOneShotTrainging} variant="contained">
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
              )}
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
        <FormControl sx={{ minWidth: 110, marginLeft: 2 }}>
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
            <MenuItem value="POLONEX">POLONEX</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <Box mt={2}>
        <Box>
          <H2Title>Training Log Console</H2Title>
        </Box>
        <TextareaAutosize
          value={logData}
          maxLength={1000}
          aria-label="minimum height"
          minRows={20}
          placeholder="Training Logs"
          style={{ width: "100%", height: "calc(100vh - 480px)", resize: "vertical", overflow: "auto" }}
        />
      </Box>
    </Box>
  );
}
