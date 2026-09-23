import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { POST, __setTypeSafeClientFactoryForTests } from './opponent.js';

type TestClientFactory = Parameters<typeof __setTypeSafeClientFactoryForTests>[0];

const validBody = {
  size: 3,
  board: ['X', null, null, null, 'O', null, null, null, null],
  moves: [
    { index: 0, player: 'X', row: 0, column: 0 },
    { index: 4, player: 'O', row: 1, column: 1 },
  ],
};

const requestFor = (body: unknown): Request =>
  new Request('http://localhost/api/tic-tac-toe/opponent', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const responseJson = async (response: Response): Promise<Record<string, unknown>> => {
  const value: unknown = await response.json();
  assert.equal(typeof value, 'object');
  assert.notEqual(value, null);
  return value as Record<string, unknown>;
};

const installFactory = (factory: TestClientFactory): void => {
  __setTypeSafeClientFactoryForTests(factory);
};

const installClient = (systemOne: (...args: readonly unknown[]) => Promise<unknown>): void => {
  const factory = (() => ({ systemOne })) as unknown as TestClientFactory;
  installFactory(factory);
};
const invoke = (body: unknown): Promise<Response> => POST({ request: requestFor(body) });

afterEach(() => {
  __setTypeSafeClientFactoryForTests(null);
});

describe('tic-tac-toe opponent endpoint', () => {
  it('returns one legal choice from the mocked TypeSafe client without network access', async () => {
    let calls = 0;
    installClient(async () => {
      calls += 1;
      return { answers: { move: { choice: 'cell_1' } } };
    });

    const response = await invoke(validBody);
    assert.equal(response.status, 200);
    assert.deepEqual(await responseJson(response), { index: 1 });
    assert.equal(calls, 1);
  });

  it('uses minimax mode for an immediate winning move without calling JEV', async () => {
    let calls = 0;
    installClient(async () => {
      calls += 1;
      return { answers: { move: { choice: 'cell_8' } } };
    });
    const response = await invoke({
      mode: 'minimax',
      size: 3,
      board: ['X', 'X', null, 'O', 'O', null, null, null, null],
      moves: [
        { index: 0, player: 'X', row: 0, column: 0 },
        { index: 3, player: 'O', row: 1, column: 0 },
        { index: 1, player: 'X', row: 0, column: 1 },
        { index: 4, player: 'O', row: 1, column: 1 },
      ],
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await responseJson(response), { index: 5 });
    assert.equal(calls, 0);
  });

  it('rejects a model choice that is occupied or otherwise illegal', async () => {
    installClient(async () => ({ answers: { move: { choice: 'cell_0' } } }));

    const response = await invoke(validBody);
    assert.equal(response.status, 502);
    const body = await responseJson(response);
    assert.equal(typeof body.error, 'string');
    assert.equal(body.error, 'The opponent is unavailable right now.');
  });

  it('converts missing credentials or client construction failures into a generic error', async () => {
    const factory = (() => {
      throw new Error('TYPESAFE_API_KEY=super-secret-key');
    }) as unknown as TestClientFactory;
    installFactory(factory);

    const response = await invoke(validBody);
    assert.equal(response.status, 502);
    const body = await responseJson(response);
    assert.equal(body.error, 'The opponent is unavailable right now.');
    assert.equal(JSON.stringify(body).includes('super-secret-key'), false);
  });

  it('converts API and network failures without exposing raw error details', async () => {
    installClient(async () => {
      throw new Error('upstream timeout with token=top-secret-token');
    });

    const response = await invoke(validBody);
    assert.equal(response.status, 502);
    const body = await responseJson(response);
    assert.equal(body.error, 'The opponent is unavailable right now.');
    assert.equal(JSON.stringify(body).includes('top-secret-token'), false);
  });

  it('rejects malformed JSON and invalid game states before constructing a client', async () => {
    let factoryCalls = 0;
    const factory = (() => {
      factoryCalls += 1;
      return {
        systemOne: async () => ({ answers: { move: { choice: 'cell_1' } } }),
      };
    }) as unknown as TestClientFactory;
    installFactory(factory);
    const malformed = new Request('http://localhost/api/tic-tac-toe/opponent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not-json',
    });
    const malformedResponse = await POST({ request: malformed });
    assert.equal(malformedResponse.status, 400);

    const invalidResponse = await invoke({ size: 3, board: ['request-secret'], moves: [] });
    assert.equal(invalidResponse.status, 400);
    assert.equal(factoryCalls, 0);
    assert.equal(JSON.stringify(await responseJson(invalidResponse)).includes('request-secret'), false);
  });
});
