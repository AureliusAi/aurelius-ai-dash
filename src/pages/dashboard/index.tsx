import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { useLayoutEffect, useEffect, useRef, useState, useMemo, useCallback } from "react";
import PageHeader from "../../page-components/PageHeader";
import Plotly, { PlotType } from "plotly.js";
import { initiateEchoSocket, disconnectEchoSocket, subscribeToEchoedMessage, sendEchoMessage } from "../../page-components/echo_websocket";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { unix_to_datetime } from "../../utils/datetime";

const binance_socketUrl = "wss://stream.binance.com:9443/ws";

export default function Dashboard() {
  const [graphRevision, setGraphRevision] = useState<number>(0);
  const [echoText, setEchoText] = useState<string>("");
  const [echoedBackText, setEchoedBackText] = useState<string>("");
  const [btcTickerData, setBtcTickerData] = useState(null);

  const [tickerType1Subscribed, setTickerType1Subscribed] = useState<boolean>(false);
  const [tickerToStreamFromBinance1, setTickerToStreamFromBinance1] = useState<string | null>("btcusdt");
  const [dataTypeToStreamFromBinance1, setDataTypeToStreamFromBinance1] = useState<string | null>("trade");
  const [dataFromDT1, setDataFromDT1] = useState<string | null>("");

  const [tickerType2Subscribed, setTickerType2Subscribed] = useState<boolean>(false);
  const [tickerToStreamFromBinance2, setTickerToStreamFromBinance2] = useState<string | null>("btcusdt");
  const [dataTypeToStreamFromBinance2, setDataTypeToStreamFromBinance2] = useState<string | null>("kline_1m");
  const [dataFromDT2, setDataFromDT2] = useState<string | null>("");

  const [subscriptions, setSubscriptions] = useState<string | null>(null);
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
          // {
          //   "e": "trade",     // Event type
          //   "E": 123456789,   // Event time
          //   "s": "BNBBTC",    // Symbol
          //   "t": 12345,       // Trade ID
          //   "p": "0.001",     // Price
          //   "q": "100",       // Quantity
          //   "b": 88,          // Buyer order ID
          //   "a": 50,          // Seller order ID
          //   "T": 123456785,   // Trade time
          //   "m": true,        // Is the buyer the market maker?
          //   "M": true         // Ignore
          // }
          const print_msg = `[${unix_to_datetime(lastJsonMessage["T"])}] Ticker: ${lastJsonMessage["s"]} @ ${lastJsonMessage["p"]}, Qty: ${
            lastJsonMessage["q"]
          } (is Buyer MM? ${lastJsonMessage["m"]})`;

          setDataFromDT1(print_msg);
        } else if (updateType == "kline") {
          // {
          //   "e": "kline",     // Event type
          //   "E": 123456789,   // Event time
          //   "s": "BNBBTC",    // Symbol
          //   "k": {
          //     "t": 123400000, // Kline start time
          //     "T": 123460000, // Kline close time
          //     "s": "BNBBTC",  // Symbol
          //     "i": "1m",      // Interval
          //     "f": 100,       // First trade ID
          //     "L": 200,       // Last trade ID
          //     "o": "0.0010",  // Open price
          //     "c": "0.0020",  // Close price
          //     "h": "0.0025",  // High price
          //     "l": "0.0015",  // Low price
          //     "v": "1000",    // Base asset volume
          //     "n": 100,       // Number of trades
          //     "x": false,     // Is this kline closed?
          //     "q": "1.0000",  // Quote asset volume
          //     "V": "500",     // Taker buy base asset volume
          //     "Q": "0.500",   // Taker buy quote asset volume
          //     "B": "123456"   // Ignore
          //   }
          // }
          const kObj = lastJsonMessage["k"];
          const print_msg = `[${unix_to_datetime(kObj["T"])}] Ticker: ${kObj["s"]} @ ${kObj["i"]}, O: ${kObj["o"]}, H: ${kObj["h"]}, L: ${kObj["l"]}, C: ${
            kObj["c"]
          }. num trades: ${kObj["n"]}, base asset vol: ${kObj["v"]}`;

          setDataFromDT2(print_msg);
        }
      } else {
        // should be a subscriptions check call
        if ("result" in lastJsonMessage) {
          if (lastJsonMessage["result"] === null) {
            setSubscriptions(null);
          } else {
            let res = lastJsonMessage["result"];
            var res_str = "";
            if (res instanceof Array) {
              for (var i = 0; i < res.length; i++) {
                res_str += i + 1 + ": " + res[i] + " ";
              }
            }
            console.log(res_str);
            setSubscriptions(res_str);
          }
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
  const handleSubscribeDataType1 = useCallback(() => {
    sendJsonMessage({
      method: "SUBSCRIBE",
      params: [`${tickerToStreamFromBinance1}@${dataTypeToStreamFromBinance1}`],
      id: 1,
    });
    setTickerType1Subscribed(true);
  }, [sendJsonMessage]);

  const handleUnSubscribeDataType1 = useCallback(() => {
    sendJsonMessage({
      method: "UNSUBSCRIBE",
      params: [`${tickerToStreamFromBinance1}@${dataTypeToStreamFromBinance1}`],
      id: 1,
    });
    setTickerType1Subscribed(false);
  }, [sendJsonMessage]);

  //---------------------------------------------------------------------------

  // this is how you start and stop feeds from binance API
  const handleSubscribeDataType2 = useCallback(() => {
    sendJsonMessage({
      method: "SUBSCRIBE",
      params: [`${tickerToStreamFromBinance2}@${dataTypeToStreamFromBinance2}`],
      id: 2,
    });
    setTickerType2Subscribed(true);
  }, [sendJsonMessage]);

  const handleUnSubscribeDataType2 = useCallback(() => {
    sendJsonMessage({
      method: "UNSUBSCRIBE",
      params: [`${tickerToStreamFromBinance2}@${dataTypeToStreamFromBinance2}`],
      id: 2,
    });
    setTickerType2Subscribed(false);
  }, [sendJsonMessage]);

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
            <Box sx={{ alignItems: "center" }} display="flex">
              <Box>{subscriptions && subscriptions}</Box>
              <Button variant="outlined" sx={{ ml: 1 }} onClick={handleClickGetSubscriptions}>
                Check Subscriptions
              </Button>
            </Box>
          </Box>
          <Box display="flex" sx={{ mb: 1, alignItems: "center" }}>
            <Box sx={{ mr: 2, color: "#999999" }}>1. </Box>
            <Button
              variant="outlined"
              sx={{ marginRight: 1 }}
              onClick={handleSubscribeDataType1}
              disabled={readyState !== ReadyState.OPEN || tickerType1Subscribed}
            >
              Subscribe
            </Button>
            <Button
              variant="outlined"
              sx={{ marginRight: 2 }}
              onClick={handleUnSubscribeDataType1}
              disabled={readyState !== ReadyState.OPEN || !tickerType1Subscribed}
            >
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
            <Button
              variant="outlined"
              sx={{ marginRight: 1 }}
              onClick={handleSubscribeDataType2}
              disabled={readyState !== ReadyState.OPEN || tickerType2Subscribed}
            >
              Subscribe
            </Button>
            <Button
              variant="outlined"
              sx={{ marginRight: 2 }}
              onClick={handleUnSubscribeDataType2}
              disabled={readyState !== ReadyState.OPEN || !tickerType2Subscribed}
            >
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
