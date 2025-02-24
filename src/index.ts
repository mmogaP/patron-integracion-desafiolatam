const express = require("express");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const path = require("path");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { configureSocket } = require("./services/socket");

const app = express();
const server = createServer(app);
const io = new Server(server);

// Middlewares
app.use(cookieParser());
app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, "public")));

// Ruta para servir el cliente HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Configuración de Socket.io
configureSocket(io);

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
