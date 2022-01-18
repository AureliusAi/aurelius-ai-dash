import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Plot from "react-plotly.js";
import { useLayoutEffect, useRef, useState } from "react";
import PageHeader from "../../page-components/PageHeader";
import Plotly, { PlotType } from "plotly.js";

var revno: number = 0;

export default function Dashboard() {
  const [graphRevision, setGraphRevision] = useState(0);
  const [echoText, setEchoText] = useState("");
  const [echoedBackText, setEchoedBackText] = useState("");
  const [randomWalkVal, setRandomWalkVal] = useState(0);
  const [rwData, setRWData] = useState({
    x: [] as Date[],
    y: [] as number[],
    type: "scatter" as PlotType,
    marker: { color: "red" },
  });

  const [plotlyData, setPlotlyData] = useState([rwData]);

  const echo_ws = useRef<WebSocket | null>(null);
  // const random_walk_ws = useRef<WebSocket | null>(null);

  useLayoutEffect(() => {
    echo_ws.current = new WebSocket("ws://localhost:5000/api/ws/echo");
    echo_ws.current.onmessage = (evt) => {
      setEchoedBackText(evt.data);
    };

    return () => {
      echo_ws.current?.close();
    };
  }, [echo_ws]);

  var rw_trace_layout = {
    xaxis: {
      // type: "date",
      showticklabels: true,
      title: "Time",
    },
    yaxis: { title: "Value" },
    title: "Server Generated Random Walk",
    width: 1000,
    height: 500,
    datarevision: 0,
  };

  // useLayoutEffect(() => {
  //   random_walk_ws.current = new WebSocket("ws://localhost:5000/api/ws/random-walk");
  //   random_walk_ws.current.onmessage = (evt) => {
  //     setRandomWalkVal(evt.data);

  //     revno = revno + 1;

  //     const newData = { ...rwData };

  //     var x_data: Date[] = rwData["x"];
  //     x_data.push(new Date());
  //     // console.log(x_data);
  //     if (x_data.length > 30) {
  //       x_data.splice(0, 1);
  //     }

  //     var y_data: number[] = rwData["y"];
  //     y_data.push(evt.data);
  //     // console.log(y_data);
  //     if (y_data.length > 30) {
  //       y_data.splice(0, 1);
  //     }

  //     newData["x"] = x_data;
  //     newData["y"] = y_data;

  //     setRWData(newData);

  //     setPlotlyData([rwData]);
  //     // console.log(plotlyData);

  //     rw_trace_layout.datarevision = rw_trace_layout.datarevision + 1;
  //     setGraphRevision(rw_trace_layout.datarevision);
  //     // console.log(graphRevision);
  //     // console.log(rw_trace_layout.datarevision);
  //     // console.log(revno);

  //     Plotly.relayout("plty", rw_trace_layout);
  //   };
  //   return () => {
  //     random_walk_ws.current?.close();
  //   };
  // }, [random_walk_ws]);

  function onEchoKeyPressed(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      echo_ws.current?.send(echoText);
      setEchoText("");
    }
  }

  return (
    <Box>
      <PageHeader>Dashboard</PageHeader>
      <Box>
        <TextField
          id="standard-basic"
          label="Server Echo Test"
          variant="standard"
          sx={{ width: "300px" }}
          onKeyDown={onEchoKeyPressed}
          onChange={(e) => setEchoText(e.target.value)}
        />
      </Box>
      <Box pt={1} sx={{ color: "#FF6666" }}>
        {echoedBackText}
      </Box>
      <Box pt={4} sx={{ color: "#FF00FF" }}>
        {randomWalkVal}
      </Box>
      <Box>
        <Plot
          divId="plty"
          useResizeHandler={true}
          onUpdate={(figure, gdiv) => console.log("was updated!!!!! " + Date())}
          revision={revno}
          data={plotlyData}
          layout={rw_trace_layout}
        />
      </Box>
    </Box>
  );
}
