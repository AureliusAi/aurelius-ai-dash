import React, { useState } from "react";
import Plot from "react-plotly.js";
import Box from "@mui/material/Box";
import DateAdapter from "@mui/lab/AdapterDateFns";
import PageHeader from "../../page-components/PageHeader";
import LocalizationProvider from "@mui/lab/LocalizationProvider";
import DatePicker from "@mui/lab/DatePicker";
import TextField from "@mui/material/TextField";
import { useTheme } from "@mui/material/styles";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";

export default function Data() {
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date());

  const theme = useTheme();

  return (
    <Box>
      <PageHeader>Data</PageHeader>
      <Box pt={1} sx={{ color: theme.palette.text.secondary }}>
        Get data from DB to inspect
      </Box>
      <Box
        sx={{
          bgcolor: "background.paper",
          p: 2,
          mt: 2,
          mb: 2,
          borderRadius: 3,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Box sx={{ color: theme.palette.text.secondary, paddingRight: "20px" }}>Predefined date ranges:</Box>
          <ButtonGroup variant="text" aria-label="outlined button group">
            <Button>1 Month</Button>
            <Button>2 Months</Button>
            <Button>3 Months</Button>
            <Button>6 Months</Button>
            <Button>1 Year</Button>
            <Button>3 Years</Button>
            <Button>All</Button>
          </ButtonGroup>
        </Box>
        <Box
          sx={{
            pt: 2,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Box>
            <LocalizationProvider dateAdapter={DateAdapter}>
              <DatePicker
                label="Start Date"
                inputFormat="yyyy-MM-dd"
                value={startDate}
                onChange={(date: Date | null) => setStartDate(date)}
                renderInput={(params) => <TextField {...params} />}
              />
            </LocalizationProvider>
          </Box>
          <Box ml={2}>
            <LocalizationProvider dateAdapter={DateAdapter}>
              <DatePicker
                label="End Date"
                inputFormat="yyyy-MM-dd"
                value={endDate}
                onChange={(date: Date | null) => setEndDate(date)}
                renderInput={(params) => <TextField {...params} />}
              />
            </LocalizationProvider>
          </Box>
          <Box ml={2}>
            <Button variant="contained">Get Data</Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
