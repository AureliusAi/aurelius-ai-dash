import React from "react";
import Plot from "react-plotly.js";
import Box from "@mui/material/Box";
import PageHeader from "../../page-components/PageHeader";

export default function Data() {
  return (
    <Box>
      <PageHeader>Data</PageHeader>
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
    </Box>
  );
}
