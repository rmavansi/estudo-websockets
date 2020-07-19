import 'dotenv/config';
import express from 'express';
import Youch from 'youch';
import * as Sentry from '@sentry/node';
import 'express-async-errors';
import cors from 'cors';
import socketIo from 'socket.io';
import http from 'http';
import routes from './routes';
import sentryConfig from './config/sentry';

import './database';

import index from './routes/index';

const port = process.env.PORT || 4001;

const app = express();
app.use(index);
const server = http.createServer(app);
const io = socketIo(server);

server.listen(port, () => console.log(`Listening on port ${port}`));

const chat = [];

io.on('connection', socket => {
  console.log(`New client connected: ${socket.id}`);

  socket.emit('oldMessages', chat);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });

  socket.on('sendMessage', data => {
    chat.push({ id: socket.id, message: data });
    socket.broadcast.emit('returnMessage', chat);
    socket.emit('returnMessage', chat);
  });
});

class App {
  constructor() {
    this.server = express();

    Sentry.init(sentryConfig);

    this.middlewares();
    this.routes();
    this.exceptionHandler();
  }

  middlewares() {
    this.server.use(Sentry.Handlers.requestHandler());
    this.server.use(cors());
    this.server.use(express.json());
  }

  routes() {
    this.server.use(routes);
    this.server.use(Sentry.Handlers.errorHandler());
  }

  exceptionHandler() {
    this.server.use(async (err, req, res, next) => {
      if (process.env.NODE_ENV === 'development') {
        const errors = await new Youch(err, req).toJSON();

        return res.status(500).json(errors);
      }
      return res.status(500).json({ error: 'Internal server error' });
    });
  }
}

export default new App().server;