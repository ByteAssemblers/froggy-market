import { io, Socket } from "socket.io-client";

let socket: Socket;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_FROGGY_MARKET_BACKEND ?? "", {
      path: "/socket.io",
      autoConnect: true,
    });
  }
  return socket;
};
