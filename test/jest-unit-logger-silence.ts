import { Logger } from '@nestjs/common';

/**
 * Nest Logger defaults to stderr; specs that exercise failure paths would
 * flood CI output. Silence Nest log methods for unit tests only.
 */
beforeAll(() => {
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'verbose').mockImplementation(() => undefined);
});
