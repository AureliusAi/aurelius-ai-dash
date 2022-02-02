import Box from "@mui/material/Box";
import { AgGridColumn, AgGridReact } from "ag-grid-react";
import React from "react";
import Plot from "react-plotly.js";
import PageHeader from "../../page-components/PageHeader";

export default function Backtest() {
  const rowData = [
    { make: "Toyota", model: "Celica", price: 35000 },
    { make: "Ford", model: "Mondeo", price: 32000 },
    { make: "Porsche", model: "Boxter", price: 72000 },
  ];

  return (
    <Box>
      <PageHeader>Backtest</PageHeader>
      <Box>
        <Plot
          data={[
            {
              x: [1, 2, 3],
              y: [2, 6, 3],
              type: "scatter",
              mode: "lines+markers",
              marker: { color: "red" },
            },
            { type: "bar", x: [1, 2, 3], y: [2, 5, 3] },
          ]}
          layout={{ width: 320, height: 240, title: "A Fancy Plot" }}
        />
      </Box>
      <div className="ag-theme-balham" style={{ height: 400, width: 600 }}>
        <AgGridReact reactUi={true} rowData={rowData}>
          <AgGridColumn field="make"></AgGridColumn>
          <AgGridColumn field="model"></AgGridColumn>
          <AgGridColumn field="price"></AgGridColumn>
        </AgGridReact>
      </div>
    </Box>
  );
}
