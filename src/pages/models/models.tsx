import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import LinearProgress from '@mui/material/LinearProgress';
import PageHeader, { H2Title } from "../../page-components/PageHeader";
import { API_MODELS_ENDPOINT } from "../../endpoints";
import { AgGridReact } from "ag-grid-react";
import { CellClickedEvent } from "ag-grid-community/dist/lib/events";
import Plot from 'react-plotly.js';

function Models() {
  const [modelData, setModelData] = useState(null);
  const [chartData, setChartData] = useState<boolean | null>(null);
  const [gridApi, setGridApi] = useState(null);

  const [dataRetError, setDataRetError] = useState(null)
  const [dataRetLoading, setDataRetLoading] = useState(false)

  const [plotError, setPlotError] = useState(null)
  const [plotLoading, setPlotLoading] = useState(false)

  const [yAxis, setYAxis] = useState<Array<number>>([])
    const [timeAxis, setTimeAxis] = useState<Array<Date>>([])

  const refreshNNFromDB = () => {
    setDataRetError(null);
    setDataRetLoading(true);
    fetch(`${API_MODELS_ENDPOINT}/get-all`)
      .then((res) => res.json())
      .then(
        (result) => {
          setModelData(JSON.parse(result.models));
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          setDataRetError(error);
        }
      )
      .catch((error) => {
        // handle the error
      })
      .finally(() => {
        setDataRetLoading(false);
      });
  };

  useEffect(() => {
    refreshNNFromDB();
  }, []);

  const modelDataTableColDefs = [
    { headerName: "Key", field: "key", width: 150, type: 'nonEditableColumn'  },
    { headerName: "Test PV", field: "test_pv" , width: 120 },
    { headerName: "Test Log Mean", field: "test_log_mean", width: 130  },
    { headerName: "Test Log Mean Free", field: "test_log_mean_free", width: 160 },
    { headerName: "BackTest PV", field: "backtest_test_pv", width: 120 },
    { headerName: "BackTest Log Mean", field: "backtest_test_log_mean", width: 160 },
    { headerName: "Start Date", field: "input_start_date", width: 110 },
    { headerName: "End Date", field: "input_end_date", width: 110},
    { headerName: "Coin #", field: "input_coin_number", width: 90},
    { headerName: "# Epochs", field: "training_num_epochs", width: 110 },
    { headerName: "Test Portion", field: "input_test_portion", width: 120 },
    { headerName: "NN Agent", field: "training_nn_agent_name", width: 110 },
    { headerName: "Period (S)", field: "input_global_period", width: 100 },
    { headerName: "Data Provider", field: "input_data_provider", width: 130 },
    { headerName: "Window Size", field: "input_window_size", width: 120 },
    { headerName: "Feature #", field: "input_feature_number", width: 110 },
    { headerName: "Training Time", field: "training_time", width: 120 },
    { headerName: "Config", field: "config" , width: 300 },
    { headerName: "Stored Path", field: "stored_path" , width: 300 },
  ];

  // define a column type (you can define as many as you like)
  const columnTypes = {
    nonEditableColumn: { editable: false }
  };

  const onGridReady = (param: any) => {
    setGridApi(param.api);
  };

  const modelRowDoubleClicked = (event: CellClickedEvent) => {
    const selected_key = event.data['key']
    console.log('Cell was clicked.' + event.data['key'])
    // get table/plot
    // /api/config/models/plot
    const plotOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: selected_key, algos: [] }),
    };

    setPlotError(null);
    setPlotLoading(true);
    fetch(`${API_MODELS_ENDPOINT}/plot-results`, plotOptions)
      .then((res) => res.json())
      .then(
        (result) => {
          let cd = JSON.parse(result.chartData);
          setTimeAxis(cd['XAxis'])
          setYAxis(cd['Data'])
          setChartData(cd);
          console.log(cd)
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          setPlotError(error);
        }
      )
      .catch((error) => {
        // handle the error
      })
      .finally(() => {
        setPlotLoading(false);
      });
  }

  return (
    <Box sx={{ p: 0, m: 0 }}>
      <H2Title>Trained Models</H2Title>
      {dataRetLoading ? (
          <LinearProgress />
        ) : (
          dataRetError ? (
            <Box sx={{color:'#FF3333'}}>{dataRetError}</Box>
          ) : (
            <Box>
      <div className="ag-theme-balham" style={{ height: "300px", width: "100%" }}>
        <AgGridReact
          rowData={modelData}
          columnDefs={modelDataTableColDefs}
          defaultColDef={{
            sortable: true,
            editable: true,
            filter: true,
            floatingFilter: true,
          }}
          onRowDoubleClicked={modelRowDoubleClicked}
          columnTypes={columnTypes}
          onGridReady={onGridReady}
        ></AgGridReact>
      </div>
      <Box mt={2}>
        { plotLoading ? (
            <LinearProgress />
        ):(      
        chartData && (
          <Plot
          data={[
            {
              x: timeAxis,
              y: yAxis,
              type: 'scatter',
              mode: 'lines+markers',
              marker: {color: 'red'},
            },
          ]}
          layout={{width: 800, height: 500, title: 'Training Result'} }
        />
        ) )}
        </Box>
        </Box>
      ))}
      
    </Box>
  );
}

export default Models;
