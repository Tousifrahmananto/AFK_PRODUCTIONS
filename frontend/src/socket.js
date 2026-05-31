import { io } from "socket.io-client";
const URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export function makeSocket(userId) {
  const socket = io(URL, { withCredentials: true, transports: ["websocket"] });
  socket.on("connect", () => {
    socket.emit("identify", { userId });
  });
  return socket;
}
