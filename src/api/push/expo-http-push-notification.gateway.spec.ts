import { ExpoHttpPushNotificationGateway } from './expo-http-push-notification.gateway';

describe('ExpoHttpPushNotificationGateway', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('POSTs message array to Expo and ignores non-OK without throwing', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'unavailable',
    });

    const gw = new ExpoHttpPushNotificationGateway();
    await expect(
      gw.sendRunNearby(['ExponentPushToken[a]'], {
        runId: 'r1',
        title: 't',
        body: 'b',
      }),
    ).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://exp.host/--/api/v2/push/send',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('swallows transport errors from fetch', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ENOTFOUND'));

    const gw = new ExpoHttpPushNotificationGateway();
    await expect(
      gw.sendRunNearby(['ExponentPushToken[a]'], {
        runId: 'r1',
        title: 't',
        body: 'b',
      }),
    ).resolves.toBeUndefined();
  });

  it('deduplicates tokens', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ status: 'ok' }] }),
    });

    const gw = new ExpoHttpPushNotificationGateway();
    await gw.sendRunNearby(
      ['ExponentPushToken[a]', 'ExponentPushToken[a]'],
      { runId: 'r1', title: 't', body: 'b' },
    );

    const body = JSON.parse(
      (global.fetch as jest.Mock).mock.calls[0][1].body as string,
    );
    expect(body).toHaveLength(1);
  });
});
