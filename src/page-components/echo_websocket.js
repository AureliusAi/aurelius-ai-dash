import io from "socket.io-client";

let echo_socket;

export const initiateEchoSocket = () => {
  /**
   * Initialize Websocket connection with echo websocket
   */
  echo_socket = io("ws://localhost:5000/api/ws/echo");
  console.log(`Connecting to the echo websocket...`);
  if (echo_socket) {
    echo_socket.emit("echo_event", () => {
      console.log("Websocket connected: " + echo_socket.connected);
    });
  }
};

export const disconnectEchoSocket = () => {
  /**
   * On disconnect, properly disconnect from websocket
   */
  console.log("Disconnecting from echo websocket...");
  if (echo_socket) echo_socket.disconnect();
};

export const subscribeToEchoedMessage = (cb) => {
  /**
   * subscribes to messages coming back from the websocket server
   */
  if (!echo_socket) return true;
  echo_socket.on("echoed-msg", (msg) => {
    console.log("Websocket event received! " + msg);
    return cb(null, msg["data"]);
  });
};

export const sendEchoMessage = (message) => {
  /**
   * Sends message to echo websocket to be echoed back
   */
  if (echo_socket) echo_socket.emit("echo_event", { message });
};
