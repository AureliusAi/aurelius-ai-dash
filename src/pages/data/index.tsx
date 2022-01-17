import DateAdapter from "@mui/lab/AdapterDateFns";
import DatePicker from "@mui/lab/DatePicker";
import LocalizationProvider from "@mui/lab/LocalizationProvider";
import { CircularProgress } from "@mui/material";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import { useTheme } from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import "ag-grid-community/dist/styles/ag-grid.css";
import "ag-grid-community/dist/styles/ag-theme-balham.css";
import { AgGridReact } from "ag-grid-react";
import React, { useEffect, useState } from "react";
import { API_DATA_ENDPOINT } from "../../endpoints";
import PageHeader from "../../page-components/PageHeader";

export default function Data() {
  const [minDate, setMinDate] = useState<Date | null>(null);
  const [maxDate, setMaxDate] = useState<Date | null>(null);
  const [coins, setCoins] = useState<string[] | null>(null);
  const [isMinMaxDatesRetreivedError, setMinMaxDatesRetreivedError] = useState<string | null>(null);
  const [isMinMaxDatesBeingLoaded, setMinMaxDatesBeingLoaded] = useState<boolean>(false);
  const [isCoinsRetrievedError, setCoinsRetrievedError] = useState<string | null>(null);
  const [isCoinsBeingLoaded, setCoinsBeingLoaded] = useState<boolean>(false);

  const [histData, setHistData] = useState(null);

  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date());

  const theme = useTheme();

  /**
   * Load and populate the min/max dates that exist in the DB
   */

  useEffect(() => {
    setMinMaxDatesRetreivedError(null);
    setMinMaxDatesBeingLoaded(true);
    fetch(`${API_DATA_ENDPOINT}/get-min-max-data-dates`)
      .then((res) => res.json())
      .then(
        (result) => {
          setMaxDate(result["max_date"]);
          setMinDate(result["min_date"]);
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          setMinMaxDatesBeingLoaded(true);
          setMinMaxDatesRetreivedError(error);
        }
      );
  }, []);

  useEffect(() => {
    const coinRequestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isall: true, startdate: "", enddate: "" }),
    };
    setCoinsRetrievedError(null);
    setCoinsBeingLoaded(true);
    setCoinsRetrievedError(null);
    fetch(`${API_DATA_ENDPOINT}/get-avail-coins`, coinRequestOptions)
      .then((res) => res.json())
      .then(
        (result) => {
          setCoins(result["coin_list"].join(", "));
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          setCoinsBeingLoaded(true);
          setCoinsRetrievedError(error);
        }
      );
  }, []);

  function getHistoricData(event: React.MouseEvent) {
    const coinRequestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coinlist: "", startdate: startDate, enddate: endDate }),
    };
    setCoinsRetrievedError(null);
    setCoinsBeingLoaded(true);
    setCoinsRetrievedError(null);
    fetch(`${API_DATA_ENDPOINT}/get-hist-data`, coinRequestOptions)
      .then((res) => res.json())
      .then(
        (result) => {
          console.log(result.hist_data);
          setHistData(JSON.parse(result.hist_data));
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          setCoinsBeingLoaded(true);
          setCoinsRetrievedError(error);
        }
      );
  }

  function on1MonthClicked(event: React.MouseEvent) {
    const PAST_DATE = new Date();
    PAST_DATE.setMonth(PAST_DATE.getMonth() - 1);
    setStartDate(PAST_DATE);
    setEndDate(new Date());
  }

  function on2MonthsClicked(event: React.MouseEvent) {
    const PAST_DATE = new Date();
    PAST_DATE.setMonth(PAST_DATE.getMonth() - 2);
    setStartDate(PAST_DATE);
    setEndDate(new Date());
  }

  function on3MonthsClicked(event: React.MouseEvent) {
    const PAST_DATE = new Date();
    PAST_DATE.setMonth(PAST_DATE.getMonth() - 3);
    setStartDate(PAST_DATE);
    setEndDate(new Date());
  }

  function on6MonthsClicked(event: React.MouseEvent) {
    const PAST_DATE = new Date();
    PAST_DATE.setMonth(PAST_DATE.getMonth() - 6);
    setStartDate(PAST_DATE);
    setEndDate(new Date());
  }

  function on1YearClicked(event: React.MouseEvent) {
    const PAST_DATE = new Date();
    PAST_DATE.setMonth(PAST_DATE.getMonth() - 12);
    setStartDate(PAST_DATE);
    setEndDate(new Date());
  }

  function on3YearsClicked(event: React.MouseEvent) {
    const PAST_DATE = new Date();
    PAST_DATE.setMonth(PAST_DATE.getMonth() - 36);
    setStartDate(PAST_DATE);
    setEndDate(new Date());
  }

  function on5YearsClicked(event: React.MouseEvent) {
    const PAST_DATE = new Date();
    PAST_DATE.setMonth(PAST_DATE.getMonth() - 60);
    setStartDate(PAST_DATE);
    setEndDate(new Date());
  }

  function onAllDataClicked(event: React.MouseEvent) {
    setStartDate(minDate);
    setEndDate(maxDate);
  }

  const columnDefs = [
    {
      headerName: "Timestamp",
      field: "date",
    },
    {
      headerName: "Date",
      field: "isodate",
      width: 150,
    },
    {
      headerName: "Coin",
      field: "coin",
      width: 85,
    },
    {
      headerName: "High",
      field: "high",
    },
    {
      headerName: "Low",
      field: "low",
    },
    {
      headerName: "Open",
      field: "open",
    },
    {
      headerName: "Close",
      field: "close",
    },
    {
      headerName: "Volumn",
      field: "volume",
    },
    {
      headerName: "QuoteVolume",
      field: "quoteVolume",
    },
    {
      headerName: "WeightedAverage",
      field: "weightedAverage",
      width: 140,
    },
  ];

  const defaultColDef = {
    sortable: true,
    width: 120,
    editable: true,
    filter: true,
  };

  return (
    <Box>
      <PageHeader>Data</PageHeader>
      <Box pt={1} sx={{ color: theme.palette.text.secondary }}>
        Functions:
        <ul>
          <li>Get data from DB to inspect</li>
          <li>Update data from data sources</li>
        </ul>
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
          <Box sx={{ color: theme.palette.text.secondary, paddingRight: "20px" }}>Min Date (in the DB):</Box>
          <Box>{minDate ? minDate : <CircularProgress size={18} />}</Box>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Box sx={{ color: theme.palette.text.secondary, paddingRight: "20px" }}>Max Date (in the DB):</Box>
          <Box>{maxDate ? maxDate : <CircularProgress size={18} />}</Box>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Box sx={{ color: theme.palette.text.secondary, paddingRight: "20px" }}>List of Coins (in the DB):</Box>
          <Box>{coins ? coins : <CircularProgress size={18} />}</Box>
        </Box>
        <Box
          sx={{
            pt: 2,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Box sx={{ color: theme.palette.text.secondary, paddingRight: "20px" }}>Predefined date ranges:</Box>
          <ButtonGroup variant="text" aria-label="outlined button group">
            <Button onClick={on1MonthClicked}>1 Month</Button>
            <Button onClick={on2MonthsClicked}>2 Months</Button>
            <Button onClick={on3MonthsClicked}>3 Months</Button>
            <Button onClick={on6MonthsClicked}>6 Months</Button>
            <Button onClick={on1YearClicked}>1 Year</Button>
            <Button onClick={on3YearsClicked}>3 Years</Button>
            <Button onClick={on5YearsClicked}>5 Years</Button>
            <Button onClick={onAllDataClicked}>All</Button>
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
                mask="____-__-__"
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
                mask="____-__-__"
                value={endDate}
                onChange={(date: Date | null) => setEndDate(date)}
                renderInput={(params) => <TextField {...params} />}
              />
            </LocalizationProvider>
          </Box>
          <Box ml={2}>
            <Button onClick={getHistoricData} variant="contained">
              Get Data
            </Button>
          </Box>
        </Box>
      </Box>
      <Box sx={{ pt: 1 }}>
        <div className="ag-theme-balham" style={{ height: "calc(100vh - 590px)", width: "100%" }}>
          {histData ? (
            <AgGridReact columnDefs={columnDefs} defaultColDef={defaultColDef} rowData={histData} pagination={true} rowSelection="multiple"></AgGridReact>
          ) : (
            <span></span>
          )}
        </div>
      </Box>
    </Box>
  );
}
