import DateAdapter from "@mui/lab/AdapterDateFns";
import DatePicker from "@mui/lab/DatePicker";
import LoadingButton from "@mui/lab/LoadingButton";
import LocalizationProvider from "@mui/lab/LocalizationProvider";
import { InputLabel } from "@mui/material";
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import OutlinedInput from "@mui/material/OutlinedInput";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import { useTheme } from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import { useEffect, useLayoutEffect, useState } from "react";
import { checkDateDiff, checkNumDaysBetweenYYYYMMDD } from "../../common/date_functions";
import { API_BACKTESTING_ENDPOINT, API_CONFIG_ENDPOINT } from "../../endpoints";
import PageHeader from "../../page-components/PageHeader";

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

export default function Backtest() {
  const [startTrainDate, setStartTrainDate] = useState<Date | null>(new Date());
  const [endTrainDate, setEndTrainDate] = useState<Date | null>(new Date());
  const [availModels, setAvailModels] = useState<string[] | null>(null);
  const [algoList, setAlgoList] = useState<string[] | null>(null);
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);
  const [modelNotSetError, setModelNotSetError] = useState<string | null>(null);
  const [modelToUse, setModelToUse] = useState<string>("");

  const [isBacktestRunning, setBacktestRunning] = useState<boolean>(false);
  const [backtestError, setBacktestError] = useState<string | null>(null);
  const [backtestStatus, setBacktestStatus] = useState<string | null>(null);

  const [dataRetError, setDataRetError] = useState(null);
  const [dataRetLoading, setDataRetLoading] = useState(false);

  const [backTestAlgosRetError, setBackTestAlgosRetError] = useState<boolean>(false);
  const [backTestAlgosLoading, setBackTestAlgosLoading] = useState<boolean>(false);
  const [backtestStatusMsg, setBacktestStatusMsg] = useState<string | null>(null);

  const theme = useTheme();

  useLayoutEffect(() => {
    const PAST_DATE = new Date();
    PAST_DATE.setMonth(PAST_DATE.getMonth() - 1);
    setStartTrainDate(PAST_DATE);
  }, []);

  useEffect(() => {
    setDateRangeError(checkDateDiff(get_training_start_date(), get_training_end_date()));
  }, [startTrainDate, endTrainDate]);

  useEffect(() => {
    get_list_of_avail_models();
    get_list_of_backtest_algos();
  }, []);

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

  const get_list_of_backtest_algos = () => {
    setBackTestAlgosRetError(false);
    setBackTestAlgosLoading(true);
    fetch(`${API_BACKTESTING_ENDPOINT}/get-benchmark-algos`)
      .then((res) => res.json())
      .then(
        (result) => {
          setAlgoList(result["algo_list"]);
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          setBackTestAlgosRetError(error);
        }
      )
      .finally(() => {
        setBackTestAlgosLoading(false);
      });
  };

  const get_list_of_avail_models = () => {
    setDataRetError(null);
    setDataRetLoading(true);
    fetch(`${API_CONFIG_ENDPOINT}/models/get-names-list`)
      .then((res) => res.json())
      .then(
        (result) => {
          setAvailModels(result["model_list"]);
          console.log(result["model_list"]);
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          setDataRetError(error);
        }
      )
      .finally(() => {
        setDataRetLoading(false);
      });
  };

  const handleModelSelectionChanged = (event: SelectChangeEvent<typeof modelToUse>) => {
    const {
      target: { value },
    } = event;
    setModelToUse(value);
    if (value) {
      console.log("setting Model value to: " + value);
      setModelNotSetError(null);
    } else {
      setModelNotSetError("Please select a Model to use");
    }
  };

  const kick_off_backtest = (startdtstr: string, enddtstr: string, modelToUse: string) => {
    const plotOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startdtstr: startdtstr, enddtstr: enddtstr, modeltouse: modelToUse }),
    };
    setBacktestRunning(true);
    setBacktestError(null);
    fetch(`${API_BACKTESTING_ENDPOINT}/run-backtest-for-date-range-with-model`, plotOptions)
      .then((res) => res.json())
      .then(
        (result) => {
          let is_error: boolean = Boolean(result["is_error"]);
          if (is_error) {
            setBacktestError(result["error_msg"]);
          } else {
            setBacktestError(null);
          }
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          setBacktestError(error);
        }
      )
      .catch((error) => {
        // handle the error
      })
      .finally(() => {
        setBacktestRunning(false);
      });
  };

  function onRunBacktest(event: React.MouseEvent) {
    setBacktestStatusMsg(null);

    // check we have all the input params set

    // 1. check the NN is selected
    if (!modelToUse) {
      setModelNotSetError("Please select a Model to use in the backtest");
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

    setBacktestStatusMsg("kicking off backtesting");
    kick_off_backtest(startdtstr, enddtstr, modelToUse);
  }

  return (
    <Box>
      <PageHeader>Backtest</PageHeader>
      <Box>
        <Box pb={4} sx={{ color: theme.palette.text.secondary }}>
          Perform backtest with a given model and specified benchmark strategies
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
                  if (date != null) {
                    if (!isNaN(date.getTime())) {
                      setStartTrainDate(date);
                    }
                  }
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
            <FormControl sx={{ width: 300 }}>
              <InputLabel id="demo-multiple-checkbox-label">Select Model</InputLabel>
              <Select
                labelId="demo-multiple-checkbox-label"
                id="demo-multiple-checkbox"
                value={modelToUse}
                onChange={handleModelSelectionChanged}
                input={<OutlinedInput label="Tag" />}
                renderValue={(selected) => selected}
                MenuProps={MenuProps}
              >
                {availModels &&
                  availModels.map((nn) => (
                    <MenuItem key={nn} value={nn}>
                      <ListItemText primary={nn} />
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>
          <Box ml={2}>
            {modelNotSetError && <Box sx={{ color: "#FF3333" }}>{modelNotSetError}</Box>}
            {dateRangeError && <Box sx={{ color: "#FF3333" }}>{dateRangeError}</Box>}
            {dateRangeError == null && modelNotSetError == null && (
              <Box>
                <Box sx={{ alignItems: "center" }} display="flex">
                  <LoadingButton loading={isBacktestRunning} onClick={onRunBacktest} variant="contained">
                    Run Back Test
                  </LoadingButton>

                  {backtestError ? (
                    <Box sx={{ color: "#FF3333" }} ml={2}>
                      {backtestError}
                    </Box>
                  ) : (
                    <span />
                  )}
                  {backtestStatus ? (
                    <Box sx={{ color: "#35a660" }} ml={2}>
                      {backtestStatus}
                    </Box>
                  ) : (
                    <span />
                  )}

                  {backtestStatusMsg ? (
                    <Box sx={{ color: "#35a660" }} ml={2}>
                      {backtestStatusMsg}
                    </Box>
                  ) : (
                    <span />
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
        <Box mt={2}>
          {algoList && (
            <Box>
              <span style={{ color: "#AAAAAA" }}>Available Backtest Algos</span> [{algoList.join(", ")}]
            </Box>
          )}
        </Box>

        <Box mt={0} display="Flex" sx={{ alignContent: "center", alignItems: "center" }}></Box>
      </Box>
    </Box>
  );
}
