import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { useLayoutEffect, useEffect, useRef, useState, useMemo, useCallback } from "react";
import PageHeader from "../../page-components/PageHeader";
import Plotly, { PlotType } from "plotly.js";
import { initiateEchoSocket, disconnectEchoSocket, subscribeToEchoedMessage, sendEchoMessage } from "../../page-components/echo_websocket";
import useWebSocket, { ReadyState } from "react-use-websocket";

var revno: number = 0;

const binance_socketUrl = "wss://stream.binance.com:9443/ws";

export default function Dashboard() {
  const [graphRevision, setGraphRevision] = useState<number>(0);
  const [echoText, setEchoText] = useState<string>("");
  const [echoedBackText, setEchoedBackText] = useState<string>("");
  const [btcTickerData, setBtcTickerData] = useState(null);

  const [tickerToStreamFromBinance1, setTickerToStreamFromBinance1] = useState<string | null>("btcusdt");
  const [dataTypeToStreamFromBinance1, setDataTypeToStreamFromBinance1] = useState<string | null>("trade");
  const [dataFromDT1, setDataFromDT1] = useState<string | null>("");

  const [tickerToStreamFromBinance2, setTickerToStreamFromBinance2] = useState<string | null>("btcusdt");
  const [dataTypeToStreamFromBinance2, setDataTypeToStreamFromBinance2] = useState<string | null>("kline_1m");
  const [dataFromDT2, setDataFromDT2] = useState<string | null>("");

  const [numbTotalSubscriptions, setNumbTotalSubscriptions] = useState<number | null>(null);
  const [bids, setBids] = useState([0]);
  const [rwData, setRWData] = useState({
    x: [] as Date[],
    y: [] as number[],
    type: "scatter" as PlotType,
    marker: { color: "red" },
  });

  const messageHistory = useRef<MessageEvent[]>([]);

  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(binance_socketUrl);

  /////////////////////////////////////////////////////////////////////////////
  // Binance Websocket service
  /////////////////////////////////////////////////////////////////////////////

  useEffect(() => {
    console.log(lastJsonMessage);
    if (lastJsonMessage) {
      if ("e" in lastJsonMessage) {
        const updateType: string = lastJsonMessage["e"];
        if (updateType === "trade") {
          setDataFromDT1(JSON.stringify(lastJsonMessage));
        } else if (updateType == "kline") {
          setDataFromDT2(JSON.stringify(lastJsonMessage));
        }
      }
    }
  }, [lastJsonMessage]);

  messageHistory.current = useMemo(() => messageHistory.current.concat(lastJsonMessage ?? []), [lastJsonMessage]);

  const connectionStatus = {
    [ReadyState.CONNECTING]: "Connecting",
    [ReadyState.OPEN]: "Open",
    [ReadyState.CLOSING]: "Closing",
    [ReadyState.CLOSED]: "Closed",
    [ReadyState.UNINSTANTIATED]: "Uninstantiated",
  }[readyState];

  // this is how you start and stop feeds from binance API
  const handleSubscribeDataType1 = useCallback(
    () =>
      sendJsonMessage({
        method: "SUBSCRIBE",
        params: [`${tickerToStreamFromBinance1}@${dataTypeToStreamFromBinance1}`],
        id: 1,
      }),
    [sendJsonMessage]
  );

  const handleUnSubscribeDataType1 = useCallback(
    () =>
      sendJsonMessage({
        method: "UNSUBSCRIBE",
        params: [`${tickerToStreamFromBinance1}@${dataTypeToStreamFromBinance1}`],
        id: 1,
      }),
    [sendJsonMessage]
  );

  //---------------------------------------------------------------------------

  // this is how you start and stop feeds from binance API
  const handleSubscribeDataType2 = useCallback(
    () =>
      sendJsonMessage({
        method: "SUBSCRIBE",
        params: [`${tickerToStreamFromBinance2}@${dataTypeToStreamFromBinance2}`],
        id: 2,
      }),
    [sendJsonMessage]
  );

  const handleUnSubscribeDataType2 = useCallback(
    () =>
      sendJsonMessage({
        method: "UNSUBSCRIBE",
        params: [`${tickerToStreamFromBinance2}@${dataTypeToStreamFromBinance2}`],
        id: 2,
      }),
    [sendJsonMessage]
  );

  const handleClickGetSubscriptions = useCallback(
    () =>
      sendJsonMessage({
        method: "LIST_SUBSCRIPTIONS",
        id: 1,
      }),
    [sendJsonMessage]
  );

  /////////////////////////////////////////////////////////////////////////////

  /////////////////////////////////////////////////////////////////////////////
  // Echo Webservice set up
  /////////////////////////////////////////////////////////////////////////////
  function onEchoKeyPressed(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      sendEchoMessage(echoText);
    }
  }

  useEffect(() => {
    initiateEchoSocket();

    subscribeToEchoedMessage((err: string, data: string) => {
      if (err) return;
      console.log(data);
      setEchoedBackText(data);
    });
    return () => {
      disconnectEchoSocket();
    };
  }, []);

  return (
    <Box>
      <PageHeader>Dashboard</PageHeader>
      <Box sx={{ my: 3, pb: 3, borderTop: "1px solid #CCCCCC", borderBottom: "1px solid #CCCCCC" }}>
        <Box mt={2}>
          <Box display="flex" sx={{ mb: 1, justifyContent: "space-between", alignItems: "center" }}>
            <Box display="flex">
              <Box>The WebSocket is currently</Box>
              <Box mx={1}> | </Box>
              <Box style={{ fontWeight: "bold", color: "#35a660" }}>{connectionStatus}</Box>
            </Box>
            <Box display="flex">
              <Box>{numbTotalSubscriptions && numbTotalSubscriptions}</Box>
              <Button variant="outlined" sx={{ ml: 1 }} onClick={handleClickGetSubscriptions}>
                Check Subscriptions
              </Button>
            </Box>
          </Box>
          <Box display="flex" sx={{ mb: 1, alignItems: "center" }}>
            <Box sx={{ mr: 2, color: "#999999" }}>1. </Box>
            <Button variant="outlined" sx={{ marginRight: 1 }} onClick={handleSubscribeDataType1} disabled={readyState !== ReadyState.OPEN}>
              Subscribe
            </Button>
            <Button variant="outlined" sx={{ marginRight: 2 }} onClick={handleUnSubscribeDataType1} disabled={readyState !== ReadyState.OPEN}>
              Unsubscribe
            </Button>
            <Box>data type </Box>
            <Box mx={1}> | </Box>
            <Box sx={{ color: "#35a660" }}>
              {tickerToStreamFromBinance1}@{dataTypeToStreamFromBinance1}
            </Box>
            <Box mx={1}> | </Box>
            <Box>{dataFromDT1}</Box>
          </Box>
          <Box display="flex" sx={{ alignItems: "center" }}>
            <Box sx={{ mr: 2, color: "#999999" }}>2. </Box>
            <Button variant="outlined" sx={{ marginRight: 1 }} onClick={handleSubscribeDataType2} disabled={readyState !== ReadyState.OPEN}>
              Subscribe
            </Button>
            <Button variant="outlined" sx={{ marginRight: 2 }} onClick={handleUnSubscribeDataType2} disabled={readyState !== ReadyState.OPEN}>
              Unsubscribe
            </Button>
            <Box>data type </Box>
            <Box mx={1}> | </Box>
            <Box sx={{ color: "#35a660" }}>
              {tickerToStreamFromBinance2}@{dataTypeToStreamFromBinance2}
            </Box>
            <Box mx={1}> | </Box>
            <Box>{dataFromDT2}</Box>
          </Box>
        </Box>
      </Box>
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
      <Box pt={4} sx={{ color: "#FF0000" }}>
        {btcTickerData}
      </Box>
      <Box>
        {/* <Plot
          divId="plty"
          useResizeHandler={true}
          onUpdate={(figure, gdiv) => console.log("was updated!!!!! " + Date())}
          revision={revno}
          data={plotlyData}
          layout={rw_trace_layout}
        /> */}
      </Box>
    </Box>
  );
}
