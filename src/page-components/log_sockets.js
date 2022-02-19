import io from "socket.io-client";

let socket;

export const initiateLogSocket = (log_type) => {
  socket = io("ws://localhost:5000/api/ws/training-log");
  console.log(`Connecting socket...`);
  if (socket) {
    socket.emit("log_event_stream_start", () => {
      console.log("Websocket connected: " + socket.connected);
    });
  }
  // if (socket && log_type) socket.emit("join", log_type);
};

export const disconnectLogSocket = () => {
  console.log("Disconnecting socket...");
  if (socket) {
    socket.emit("log_event_stream_stop", () => {
      console.log("Websocket log service stopped: ");
    });
  }
  if (socket) socket.disconnect();
};

export const subscribeToLog = (cb) => {
  if (!socket) return true;
  socket.on("server-msg", (msg) => {
    // console.log("Websocket event received!");
    // console.log(msg);
    return cb(null, msg["data"]);
  });
};

export const sendMessage = (log_type, message) => {
  if (socket) socket.emit("chat", { message, log_type });
};
