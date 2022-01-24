import DownloadIcon from "@mui/icons-material/Download";
import DateAdapter from "@mui/lab/AdapterDateFns";
import DatePicker from "@mui/lab/DatePicker";
import LoadingButton from "@mui/lab/LoadingButton";
import LocalizationProvider from "@mui/lab/LocalizationProvider";
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import { useTheme } from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import React, { ChangeEvent, useEffect, useLayoutEffect, useState } from "react";
import { API_TRAINING_ENDPOINT } from "../../endpoints";
import PageHeader from "../../page-components/PageHeader";

export default function TrainOneShot() {
  const theme = useTheme();

  const [startTrainDate, setStartTrainDate] = useState<Date | null>(new Date());
  const [endTrainDate, setEndTrainDate] = useState<Date | null>(new Date());
  const [coinNumber, setCoinNumber] = useState<number>(11);

  const [dateRangeError, setDateRangeError] = useState<string | null>(null);

  const [isTrainingRunning, setTrainingRunning] = useState<boolean>(false);
  const [trainingError, setTrainingError] = useState<string | null>(null);
  const [trainingStatus, setTrainingStatus] = useState<string | null>(null);

  const [isDataDownloadRunning, setDataDownloadRunning] = useState<boolean>(false);
  const [dataDownloadingError, setDataDownloadingError] = useState<string | null>(null);
  const [dataDownloadStatus, setDataDownloadStatus] = useState<string | null>(null);

  // Training loop state variables
  const [processes, setProcesses] = React.useState<string>("1");
  const [device, setDevice] = React.useState<string>("CPU");

  useLayoutEffect(() => {
    const PAST_DATE = new Date();
    PAST_DATE.setMonth(PAST_DATE.getMonth() - 1);
    setStartTrainDate(PAST_DATE);
  }, []);

  useEffect(() => {
    checkDateDiff();
  }, [startTrainDate, endTrainDate]);

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
        device: device,
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
              renderInput={(params) => <TextField {...params} />}
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
              renderInput={(params) => <TextField {...params} />}
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
            sx={{ width: "150px" }}
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

      <Box mt={2} display="Flex" sx={{ alignContent: "center", alignItems: "center" }}>
        <FormControl sx={{ minWidth: 120 }}>
          <Select
            value={processes}
            onChange={handleProcessNumberChange}
            displayEmpty
            inputProps={{ "aria-label": "number of processes you want to start to train the network" }}
          >
            <MenuItem value="1">1</MenuItem>
            <MenuItem value="2">2</MenuItem>
            <MenuItem value="3">3</MenuItem>
            <MenuItem value="3">4</MenuItem>
          </Select>
          <FormHelperText># of Processes</FormHelperText>
        </FormControl>
        <FormControl sx={{ minWidth: 120, marginLeft: 2 }}>
          <Select value={device} onChange={handleDeviceTypeChange} displayEmpty inputProps={{ "aria-label": " device to be used to train" }}>
            <MenuItem value="CPU">
              <em>CPU</em>
            </MenuItem>
            <MenuItem value="GPU">
              <em>GPU</em>
            </MenuItem>
          </Select>
          <FormHelperText>Device Type</FormHelperText>
        </FormControl>
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
    </Box>
  );
}
