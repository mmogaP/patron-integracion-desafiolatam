import { Server, Socket } from "socket.io";

// Estructuras de datos para el sistema de mensajería
const messages: Array<{
  id: number;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
}> = [];

const connectedUsers = new Map<
  string,
  { id: string; username: string; joinedAt: Date }
>();

// Configuración de logging personalizado para WebSocket events
const wsLogger = (event: string, ...args: any[]) => {
  console.log(`[WebSocket][${new Date().toISOString()}] ${event}:`, ...args);
};

// Función auxiliar para manejar desconexiones de usuarios
const handleUserDisconnect = (socket: Socket) => {
  const user = connectedUsers.get(socket.id);
  if (user) {
    connectedUsers.delete(socket.id);
    socket.broadcast.emit("userLeft", {
      userId: socket.id,
      username: user.username,
      onlineUsers: Array.from(connectedUsers.values()),
    });
    wsLogger("leave", `Usuario ${user.username} abandonó el chat`);
  }
};

// Función auxiliar para manejar errores
const handleError = (socket: Socket, event: string, error: Error) => {
  console.error(`[ERROR][${event}]`, error);
  socket.emit("error", {
    event,
    message: "Ha ocurrido un error en el servidor",
    timestamp: new Date(),
  });
};

// Configuración principal de Socket.IO
export const configureSocket = (io: Server) => {
  io.on("connection", (socket) => {
    wsLogger("connect", `Cliente conectado - ID: ${socket.id}`);

    // Evento Connect
    socket.emit("welcome", { message: "Bienvenido al servidor de mensajería" });

    // Evento Join
    socket.on("join", (userData: { username: string }) => {
      try {
        connectedUsers.set(socket.id, {
          id: socket.id,
          username: userData.username,
          joinedAt: new Date(),
        });
        wsLogger("join", `Usuario ${userData.username} se unió`);

        // Broadcast a todos los usuarios conectados
        io.emit("userJoined", {
          userId: socket.id,
          username: userData.username,
          onlineUsers: Array.from(connectedUsers.values()),
        });
      } catch (error) {
        handleError(socket, "join", error as Error);
      }
    });

    // Evento Message
    socket.on("message", (data: { content: string }) => {
      try {
        const user = connectedUsers.get(socket.id);
        if (!user) throw new Error("Usuario no autenticado");

        const messageData = {
          id: Date.now(),
          userId: socket.id,
          username: user.username,
          content: data.content,
          timestamp: new Date(),
        };

        messages.push(messageData);
        wsLogger("message", `Mensaje de ${user.username}: ${data.content}`);

        // Broadcast del mensaje a todos los usuarios
        io.emit("newMessage", messageData);
      } catch (error) {
        handleError(socket, "message", error as Error);
      }
    });

    // Evento Leave
    socket.on("leave", () => {
      try {
        const user = connectedUsers.get(socket.id);
        if (user) {
          wsLogger("leave", `Usuario ${user.username} abandonó el chat`);
          handleUserDisconnect(socket);
        }
      } catch (error) {
        handleError(socket, "leave", error as Error);
      }
    });

    // Evento Ping
    socket.on("ping", () => {
      try {
        socket.emit("pong", { timestamp: Date.now() });
        wsLogger("ping", `Ping recibido de ${socket.id}`);
      } catch (error) {
        handleError(socket, "ping", error as Error);
      }
    });

    // Evento Disconnect
    socket.on("disconnect", () => {
      try {
        wsLogger("disconnect", `Cliente desconectado - ID: ${socket.id}`);
        handleUserDisconnect(socket);
      } catch (error) {
        handleError(socket, "disconnect", error as Error);
      }
    });

    // Evento Reconnect
    socket.on("reconnect_attempt", () => {
      wsLogger("reconnect_attempt", `Intento de reconexión - ID: ${socket.id}`);
    });
  });
};
