import morgan from 'morgan';

export const requestLogger = morgan(':method :url :status :response-time ms - :remote-addr', {
  stream: {
    write: (message: string) => {
      const logData = message.trim();
      console.log(`[REQ] ${logData}`);
    },
  },
});
