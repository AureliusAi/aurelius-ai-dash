import { useState, useEffect, useCallback } from "react";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import { H2Title } from "../../page-components/PageHeader";
import { API_MODELS_ENDPOINT } from "../../endpoints";
import { AgGridReact } from "ag-grid-react";
import { CellClickedEvent, CellEditingStoppedEvent } from "ag-grid-community/dist/lib/events";
import Plot from "react-plotly.js";

function Models() {
  const [modelData, setModelData] = useState(null);
  const [chartData, setChartData] = useState<boolean | null>(null);
  const [gridApi, setGridApi] = useState(null);

  const [dataRetError, setDataRetError] = useState(null);
  const [dataRetLoading, setDataRetLoading] = useState(false);

  const [plotError, setPlotError] = useState(null);
  const [plotLoading, setPlotLoading] = useState(false);

  const [yAxis, setYAxis] = useState<Array<number>>([]);
  const [bctYAxis, setBTCYAxcis] = useState<Array<number>>([]);
  const [timeAxis, setTimeAxis] = useState<Array<Date>>([]);

  const [updateLabelError, setUpdateLabelError] = useState<string | null>();

  const refreshModelsFromDB = () => {
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
    refreshModelsFromDB();
  }, []);

  const modelDataTableColDefs = [
    { headerName: "Key", field: "key", width: 150, type: "nonEditableColumn" },
    { headerName: "Label", field: "label", width: 120, editable: true, cellStyle: { color: "blue", backgroundColor: "#FFFFAA" } },
    { headerName: "Test PV", field: "test_pv", width: 120 },
    { headerName: "Test Log Mean", field: "test_log_mean", width: 130 },
    { headerName: "Test Log Mean Free", field: "test_log_mean_free", width: 160 },
    { headerName: "BackTest PV", field: "backtest_test_pv", width: 120 },
    { headerName: "BackTest Log Mean", field: "backtest_test_log_mean", width: 160 },
    { headerName: "Start Date", field: "input_start_date", width: 110 },
    { headerName: "End Date", field: "input_end_date", width: 110 },
    { headerName: "Start of Test Date", field: "input_start_of_test_date", width: 150 },
    { headerName: "Coin #", field: "input_coin_number", width: 90 },
    { headerName: "# Epochs", field: "training_num_epochs", width: 110 },
    { headerName: "Test Portion", field: "input_test_portion", width: 120 },
    { headerName: "NN Agent", field: "training_nn_agent_name", width: 110 },
    { headerName: "Period (S)", field: "input_global_period", width: 100 },
    { headerName: "Data Provider", field: "input_data_provider", width: 130 },
    { headerName: "Window Size", field: "input_window_size", width: 120 },
    { headerName: "Feature #", field: "input_feature_number", width: 110 },
    { headerName: "Training Time", field: "training_time", width: 120 },
    { headerName: "Fast Train", field: "training_fast_train", width: 100 },
    { headerName: "Config", field: "config", width: 300 },
    { headerName: "Stored Path", field: "stored_path", width: 300 },
  ];

  // define a column type (you can define as many as you like)
  const columnTypes = {
    nonEditableColumn: { editable: false },
  };

  const onGridReady = (param: any) => {
    setGridApi(param.api);
  };

  const modelRowDoubleClicked = (event: CellClickedEvent) => {
    const selected_key = event.data["key"];
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
          setTimeAxis(cd["XAxis"]);
          setYAxis(cd["Data"]);
          setBTCYAxcis(cd["BTC_PX_Data"]);
          setChartData(cd);
          console.log(cd);
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
  };

  const update_label_for_key = (key: string, label: string) => {
    const plotOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: key, label: label }),
    };

    setPlotError(null);
    setPlotLoading(true);
    fetch(`${API_MODELS_ENDPOINT}/update-key-label`, plotOptions)
      .then((res) => res.json())
      .then(
        (result) => {
          setUpdateLabelError(result["error_msg"]);
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
  };

  const delete_trained_model_key_from_db = (key: string) => {
    const plotOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: key }),
    };

    setPlotError(null);
    setPlotLoading(true);
    fetch(`${API_MODELS_ENDPOINT}/delete-model-with-key`, plotOptions)
      .then((res) => res.json())
      .then(
        (result) => {
          let is_error: boolean = Boolean(result["is_error"]);
          if (is_error) {
            setUpdateLabelError(result["error_msg"]);
          } else {
            refreshModelsFromDB();
          }
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
  };

  const onEditColumnCell = (event: CellEditingStoppedEvent) => {
    let colname = event.colDef["field"];
    if (colname == "label") {
      let editedkey: string = event.data["key"];
      let editedval: string = event.newValue;
      update_label_for_key(editedkey, editedval);
    }
  };

  const getContextMenuItems = useCallback((params) => {
    let key_to_delete: string = params.node.data["key"];
    let label_of_key_to_delete: string = params.node.data["label"];
    if (label_of_key_to_delete == null) {
      label_of_key_to_delete = "";
    } else {
      label_of_key_to_delete = " -- " + params.node.data["label"];
    }
    let result = [
      {
        // custom item
        name: "Delete Trained Model: " + key_to_delete + label_of_key_to_delete,
        tooltip: "Deletes the selected trained model from the system",
        action: function () {
          if (window.confirm("Are you sure you want to _delete_ (" + key_to_delete + ") this trained model from the database?")) {
            alert("deleting " + key_to_delete + "!");
            delete_trained_model_key_from_db(key_to_delete);
          } else {
            // Do nothing!
          }
        },
        cssClasses: ["redFont", "bold"],
      },
      "separator",
      "copy",
      "copyWithHeaders",
      "copyWithGroupHeaders",
      "paste",
      "separator",
      "export",
    ];
    return result;
  }, []);

  return (
    <Box sx={{ p: 0, m: 0 }}>
      <H2Title>Trained Models</H2Title>
      {updateLabelError && <Box sx={{ color: "#FF3333" }}>Error updating labe: {updateLabelError}</Box>}
      {dataRetLoading ? (
        <LinearProgress />
      ) : dataRetError ? (
        <Box sx={{ color: "#FF3333" }}>{dataRetError}</Box>
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
              stopEditingWhenCellsLoseFocus={true}
              onRowDoubleClicked={modelRowDoubleClicked}
              columnTypes={columnTypes}
              onGridReady={onGridReady}
              onCellEditingStopped={onEditColumnCell}
              getContextMenuItems={getContextMenuItems}
            ></AgGridReact>
          </div>
          <Box mt={2}>
            {plotLoading ? (
              <LinearProgress />
            ) : (
              chartData && (
                <Plot
                  data={[
                    {
                      x: timeAxis,
                      y: yAxis,
                      name: "Test Result (Units of Btc)",
                      type: "scatter",
                      mode: "lines",
                      marker: { color: "red" },
                    },
                    {
                      x: timeAxis,
                      y: bctYAxis,
                      name: "BTC USD Px",
                      marker: { color: "#00bfff" },
                      yaxis: "y2",
                      type: "scatter",
                    },
                  ]}
                  layout={{
                    width: 1000,
                    height: 450,
                    margin: {
                      t: 10,
                      b: 45,
                    },
                    showlegend: true,
                    legend: { orientation: "h", x: 0, y: 1.1 },
                    xaxis: {
                      title: "Test Date Range",
                      type: "date",
                      tickformat: "%Y-%m-%d",
                    },
                    yaxis: {
                      title: "Testing Results (Units of BTC)",
                      titlefont: { color: "red" },
                      tickfont: { color: "red" },
                      side: "left",
                    },
                    yaxis2: {
                      title: "BTC USD",
                      titlefont: { color: "#00ace6" },
                      tickfont: { color: "#00ace6" },
                      overlaying: "y",
                      side: "right",
                    },
                  }}
                />
              )
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default Models;
