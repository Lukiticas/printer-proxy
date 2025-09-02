import { Response } from "express";
import { Logger } from "winston";

interface LoggerMap {
  main: Logger;
  api: Logger;
  printing: Logger;
  errors: Logger;
  security: Logger;
}

interface ResponseMetaTracking extends Response {
  __startTime?: number;
  __bytesOut?: number;
}