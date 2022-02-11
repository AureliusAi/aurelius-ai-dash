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
import OutlinedInput from "@mui/material/OutlinedInput";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import ListItemText from "@mui/material/ListItemText";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import Checkbox from "@mui/material/Checkbox";
import LoadingButton from "@mui/lab/LoadingButton";

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

export default function Data() {
  const [minDate, setMinDate] = useState<Date | null>(null);
  const [maxDate, setMaxDate] = useState<Date | null>(null);
  const [availCoins, setAvailCoins] = useState<string[] | null>(null);
  const [coinsToGet, setCoinsToGet] = React.useState<string[]>([]);
  const [isMinMaxDatesRetreivedError, setMinMaxDatesRetreivedError] = useState<string | null>(null);
  const [isMinMaxDatesBeingLoaded, setMinMaxDatesBeingLoaded] = useState<boolean>(false);
  const [isCoinsRetrievedError, setCoinsRetrievedError] = useState<string | null>(null);
  const [isCoinsBeingLoaded, setCoinsBeingLoaded] = useState(false);

  const [histData, setHistData] = useState(null);
  const [ishistDataLoading, setHistDataLoading] = useState(false);

  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date());

  const theme = useTheme();

  /**
   * Load and populate the min/max dates that exist in the DB
   */

  useEffect(() => {
    const PAST_DATE = new Date();
    PAST_DATE.setMonth(PAST_DATE.getMonth() - 1);
    setStartDate(PAST_DATE);
  }, []);

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
    fetch(`${API_DATA_ENDPOINT}/get-avail-coins`, coinRequestOptions)
      .then((res) => res.json())
      .then(
        (result) => {
          setAvailCoins(result["coin_list"]);
          setCoinsBeingLoaded(false);
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          setCoinsRetrievedError(error);
        }
      )
      .finally(() => {
        setCoinsBeingLoaded(false);
      });
  }, []);

  const handleCoinSelectionChange = (event: SelectChangeEvent<typeof coinsToGet>) => {
    const {
      target: { value },
    } = event;
    setCoinsToGet(
      // On autofill we get a stringified value.
      typeof value === "string" ? value.split(",") : value
    );
  };

  function getHistoricData(event: React.MouseEvent) {
    const coinRequestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coinlist: coinsToGet.join(","), startdate: startDate, enddate: endDate }),
    };
    setCoinsRetrievedError(null);
    setHistDataLoading(true);
    fetch(`${API_DATA_ENDPOINT}/get-hist-data`, coinRequestOptions)
      .then((res) => res.json())
      .then(
        (result) => {
          setHistData(JSON.parse(result.hist_data));
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          setCoinsRetrievedError(error);
        }
      )
      .finally(() => {
        setHistDataLoading(false);
      });
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
      width: 150,
    },
    {
      headerName: "WeightedAverage",
      field: "weightedAverage",
      width: 150,
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
          <Box>{availCoins ? availCoins.join(", ") : <CircularProgress size={18} />}</Box>
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
                renderInput={(params) => <TextField sx={{ width: "150px" }} {...params} />}
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
                renderInput={(params) => <TextField sx={{ width: "150px" }} {...params} />}
              />
            </LocalizationProvider>
          </Box>
          <Box ml={2}>
            <FormControl sx={{ width: 250 }}>
              <InputLabel id="demo-multiple-checkbox-label">Coins</InputLabel>
              <Select
                labelId="demo-multiple-checkbox-label"
                id="demo-multiple-checkbox"
                multiple
                value={coinsToGet}
                onChange={handleCoinSelectionChange}
                input={<OutlinedInput label="Tag" />}
                renderValue={(selected) => selected.join(", ")}
                MenuProps={MenuProps}
              >
                {availCoins &&
                  availCoins.map((coin) => (
                    <MenuItem key={coin} value={coin}>
                      <Checkbox checked={coinsToGet.indexOf(coin) > -1} />
                      <ListItemText primary={coin} />
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>
          <Box ml={2}>
            <LoadingButton loading={ishistDataLoading} onClick={getHistoricData} variant="contained">
              Get Data
            </LoadingButton>
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
