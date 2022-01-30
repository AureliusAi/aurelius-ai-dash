import React, { useState } from "react";
import Box from "@mui/material/Box";
import PageHeader, { H2Title } from "../../page-components/PageHeader";
import { AgGridReact } from "ag-grid-react";

function Models() {
  const [modelData, setModelData] = useState(null);
  const [gridApi, setGridApi] = useState(null);

  const rowData = [
    {
      instance_name: "The MK1",
      nn: "Default CNN",
      nn_version: 1,
      start_train_time: "2015-10-19 12:00:00",
      end_train_time: "2021-10-19 12:00:00",
      period: "1800",
      pl: 45,
    },
    {
      instance_name: "The MK2",
      nn: "Default CNN",
      nn_version: 2,
      start_train_time: "2017-10-19 12:00:00",
      end_train_time: "2021-10-19 12:00:00",
      period: "1800",
      pl: -0.4,
    },
  ];

  const modelDataTableColDefs = [
    { headerName: "Instance Name", field: "instance_name" },
    { headerName: "Neural Net", field: "nn" },
    { headerName: "NN Version", field: "nn_version" },
    { headerName: "Start Train Time", field: "start_train_time" },
    { headerName: "End Train Time", field: "end_train_time" },
    { headerName: "Period", field: "period" },
  ];

  const onGridReady = (param: any) => {
    setGridApi(param.api);
  };

  return (
    <Box sx={{ p: 0, m: 0 }}>
      <H2Title>Trained Models</H2Title>
      <div className="ag-theme-balham" style={{ height: "calc(100vh - 250px)", width: "100%" }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={modelDataTableColDefs}
          defaultColDef={{
            sortable: true,
            editable: true,
            filter: true,
            flex: 1,
            floatingFilter: true,
          }}
          onGridReady={onGridReady}
        ></AgGridReact>
      </div>
    </Box>
  );
}

export default Models;
