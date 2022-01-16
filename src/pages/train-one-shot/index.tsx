import React, { ChangeEvent, useState } from "react";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import PageHeader from "../../page-components/PageHeader";
import DateAdapter from "@mui/lab/AdapterDateFns";
import LocalizationProvider from "@mui/lab/LocalizationProvider";
import DatePicker from "@mui/lab/DatePicker";
import TextField from "@mui/material/TextField";

export default function TrainOneShot() {
  const theme = useTheme();

  const [startTrainDate, setStartTrainDate] = useState<Date | null>(new Date());
  const [endTrainDate, setEndTrainDate] = useState<Date | null>(new Date());
  const [coinNumber, setCoinNumber] = useState<number>(11);

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
    </Box>
  );
}
