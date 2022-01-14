import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import { useEffect } from "react";
import { useState } from "react";
import PageHeader from "../../page-components/PageHeader";

export default function Dashboard() {
  const [echoText, setEchoText] = useState("");
  const [echoedBackText, setEchoedBackText] = useState("");
  const socket_connection = new WebSocket("ws://localhost:5000/echo");

  useEffect(() => {
    if (socket_connection) {
      socket_connection.onmessage = (evt) => {
        setEchoedBackText(evt.data);
      };
    }
  }, [socket_connection]);

  function onEchoKeyPressed(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key == "Enter") {
      socket_connection.send(echoText);
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
    </Box>
  );
}
