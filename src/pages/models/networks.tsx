import React, { useState } from "react";
import Box from "@mui/material/Box";
import PageHeader, { H2Title } from "../../page-components/PageHeader";
import { AgGridReact, AgGridColumn } from "ag-grid-react";
import "ag-grid-enterprise";
import NetworkDetailsRenderer from "./networkDetailsRenderer";

function Networks() {
  const [modelData, setModelData] = useState(null);
  const [gridApi, setGridApi] = useState(null);

  const rowData = [
    {
      instance_name: "Default CNN",
      version: 2.0,
      nn_definition: `[
      {"filter_shape": [1, 2], "filter_number": 3, "type": "ConvLayer"},
      {"filter_number":10, "type": "EIIE_Dense", "regularizer": "L2", "weight_decay": 5e-9},
      {"type": "EIIE_Output_WithW","regularizer": "L2", "weight_decay": 5e-8}
]`,
      creation_date: "2022-01-29 12:00:00",
      created_by: "system",
      updatedAt: "2022-01-29 23:34:00",
    },
    {
      instance_name: "Resnet 1.0",
      version: 1.0,
      nn_definition: `[
      {"filter_shape": [1, 2], "filter_number": 3, "type": "ConvLayer"},
      {"filter_number":10, "type": "EIIE_Dense", "regularizer": "L2", "weight_decay": 5e-9},
      {"type": "EIIE_Output_WithW","regularizer": "L2", "weight_decay": 5e-8}
]`,
      creation_date: "2022-01-30 12:00:00",
      created_by: "system",
      updatedAt: "2022-01-30 23:34:00",
    },
  ];

  const NetworkDataTableColDefs = [
    { headerName: "Instance Name", field: "instance_name", cellRenderer: "agGroupCellRenderer" },
    { headerName: "Version", field: "version", maxWidth: 95, editable: false },
    { headerName: "Creation Time", field: "creation_date" },
    { headerName: "Created By", field: "created_by" },
    { headerName: "Updated At", field: "updatedAt" },
  ];

  const onGridReady = (param: any) => {
    setGridApi(param.api);
  };

  return (
    <Box sx={{ p: 0, m: 0 }}>
      <H2Title>Networks</H2Title>
      <div className="ag-theme-balham" style={{ height: "calc(100vh - 250px)", width: "100%" }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={NetworkDataTableColDefs}
          defaultColDef={{
            sortable: true,
            editable: true,
            filter: true,
            flex: 1,
            floatingFilter: true,
          }}
          detailRowAutoHeight={true}
          masterDetail={true}
          detailCellRenderer={"networkDetailsRenderer"}
          frameworkComponents={{ networkDetailsRenderer: NetworkDetailsRenderer }}
          onGridReady={onGridReady}
        ></AgGridReact>
      </div>
    </Box>
  );
}

export default Networks;
