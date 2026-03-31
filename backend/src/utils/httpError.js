export class HttpError extends Error {
  constructor(statusCode, message, code = "APP_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}
