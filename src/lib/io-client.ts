import { io } from "socket.io-client";

export let client = io('http://localhost:5353', {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: true,
});

export function useIOClient() {
  return client;
}
