import React, { ChangeEvent, useState } from "react";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import PageHeader from "../../page-components/PageHeader";
import DateAdapter from "@mui/lab/AdapterDateFns";
import LocalizationProvider from "@mui/lab/LocalizationProvider";
import DatePicker from "@mui/lab/DatePicker";
import TextField from "@mui/material/TextField";
import LoadingButton from "@mui/lab/LoadingButton";
import { API_TRAINING_ENDPOINT } from "../../endpoints";

export default function TrainOneShot() {
  const theme = useTheme();

  const [startTrainDate, setStartTrainDate] = useState<Date | null>(new Date());
  const [endTrainDate, setEndTrainDate] = useState<Date | null>(new Date());
  const [coinNumber, setCoinNumber] = useState<number>(11);

  const [isTrainingRunning, setTrainingRunning] = useState<boolean>(false);
  const [trainingError, setTrainingError] = useState<string | null>(null);

  function onRunOneShotTrainging(event: React.MouseEvent) {
    let startdtstr = "";
    if (startTrainDate !== null) {
      startdtstr = startTrainDate.toISOString().split("T")[0];
    }

    let enddtstr = "";
    if (endTrainDate !== null) {
      enddtstr = endTrainDate.toISOString().split("T")[0];
    }
    const trainOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coinnum: coinNumber,
        starttrainingdate: startdtstr,
        endtrainingdate: enddtstr,
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
        }}
      >
        <Box>
          <LocalizationProvider dateAdapter={DateAdapter}>
            <DatePicker
              label="Start Train Date"
              inputFormat="yyyy-MM-dd"
              mask="____-__-__"
              value={startTrainDate}
              onChange={(date: Date | null) => setStartTrainDate(date)}
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
              onChange={(date: Date | null) => setEndTrainDate(date)}
              renderInput={(params) => <TextField {...params} />}
            />
          </LocalizationProvider>
        </Box>
      </Box>
      <Box
        mt={2}
        sx={{
          display: "flex",
          flexWrap: "wrap",
        }}
      >
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
      <Box mt={2}>
        <LoadingButton loading={isTrainingRunning} onClick={onRunOneShotTrainging} variant="contained">
          Train One Shot
        </LoadingButton>
      </Box>
    </Box>
  );
}
