import { io } from "socket.io-client";
import { API_ORIGIN as URL } from "./services/apiConfig";

export function makeSocket(token = localStorage.getItem("token")) {
  return io(URL, { auth: { token }, withCredentials: true, transports: ["websocket"] });
}
