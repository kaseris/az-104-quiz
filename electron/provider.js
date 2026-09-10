import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { ensure } from './validation.js';

const require = createRequire(import.meta.url);
// Offline startup does not need the provider SDK. Keep construction synchronous so
// cancellation/epoch checks and the reservation-to-dispatch boundary remain atomic.
const createClient = (key) => {
  const { default: OpenAI } = require('openai/index.mjs');
  return new OpenAI({
    apiKey: key,
    baseURL: 'https://api.openai.com/v1',
    maxRetries: 0,
    logLevel: 'off',
    timeout: 120000,
  });
};

export const pricingVersion = 'openai-standard-2026-09-06';
// USD / million tokens, official model pages checked 2026-09-06. Reserve cache writes too.
export const models = [
  { id: 'gpt-5.6-terra', input: 2, cached: 0.2, output: 12 },
  { id: 'gpt-5.5', input: 5, cached: 0.5, output: 30 },
  { id: 'gpt-5.6-sol', input: 4, cached: 0.4, output: 20 },
  { id: 'gpt-6-astra', input: 10, cached: 1, output: 50 },
];
export class ProviderError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}
export function providerError(error) {
  if (error instanceof ProviderError) return error;
  const status = error?.status;
  if (status === 401)
    return new ProviderError('authentication', 'The key was rejected. Replace it in Settings.');
  if (status === 403 || status === 404)
    return new ProviderError(
      'model-access',
      'This model is not accessible. Select another model and validate it.',
    );
  if (error?.code === 'insufficient_quota' || error?.code === 'billing_hard_limit_reached')
    return new ProviderError(
      'quota',
      'OpenAI quota or billing prevents this request. Check your API account.',
    );
  if (status === 429)
    return new ProviderError(
      'rate-limit',
      'OpenAI rate limit reached. Wait before explicitly retrying.',
    );
  if (status === 400)
    return new ProviderError(
      'request',
      'OpenAI rejected the request settings. Revalidate the selected model.',
    );
  return new ProviderError(
    'network',
    'The connection failed or timed out. The key may still be valid; usage may be unknown.',
  );
}
export class Provider {
  constructor(store, credentials, { clientFactory = createClient, notify = () => {} } = {}) {
    this.store = store;
    this.db = store.db;
    this.credentials = credentials;
    this.clientFactory = clientFactory;
    this.notify = notify;
    this.active = null;
    this.pendingInteractive = 0;
    this.epoch = 0;
    this.db
      .prepare(
        "UPDATE ai_requests SET status='cancelled',cost=0 WHERE status='reserved' AND job_id IS NOT NULL",
      )
      .run();
    this.db
      .prepare(
        "UPDATE ai_requests SET status='interrupted' WHERE status IN ('reserved','submitted','streaming')",
      )
      .run();
    this.config = store.setting('provider') || {
      enabled: false,
      validated: false,
      model: 'gpt-5.6-terra',
      generationModel: 'gpt-5.6-sol',
      reviewModel: 'gpt-6-astra',
      dailyLimit: null,
      maxOutputTokens: 4000,
    };
    // Each application launch requires an explicit activation. Never resume paid work.
    this.config.enabled = false;
    this.config.validated = false;
    this.persist();
  }
  persist() {
    this.store.setSetting('provider', this.config);
  }
  status() {
    return {
      ...this.config,
      credentials: this.credentials.status(),
      models,
      pricingVersion,
      active: this.active?.id || null,
      usage: this.usage(),
      error: this.lastError || null,
    };
  }
  usage() {
    const day = new Date().toISOString().slice(0, 10);
    const usage = this.db
      .prepare(
        `SELECT COALESCE(SUM(CASE WHEN day=? THEN COALESCE(cost,reserved) ELSE CASE WHEN cost IS NULL THEN reserved ELSE 0 END END),0) AS committed,
      SUM(CASE WHEN cost IS NULL THEN 1 ELSE 0 END) AS unknown,
      COALESCE(SUM(input_tokens),0) AS inputTokens, COALESCE(SUM(output_tokens),0) AS outputTokens FROM ai_requests`,
      )
      .get(day);
    const held = this.db
      .prepare('SELECT COALESCE(SUM(amount),0) AS total FROM generation_holds')
      .get().total;
    return { ...usage, held, committed: usage.committed + held };
  }
  async interactive(operation) {
    this.pendingInteractive++;
    const epoch = this.epoch;
    try {
      while (this.active && !this.closed && epoch === this.epoch)
        await new Promise((resolve) => setTimeout(resolve, 50));
      ensure(!this.closed && epoch === this.epoch, 'AI was disabled while waiting.');
      return operation();
    } finally {
      this.pendingInteractive--;
    }
  }
  settings(p = {}) {
    ensure(!this.active, 'Stop the active request before changing settings.');
    for (const key of ['model', 'generationModel', 'reviewModel'])
      if (p[key] !== undefined)
        ensure(
          models.some((m) => m.id === p[key]),
          'Choose a supported model.',
        );
    if (p.dailyLimit !== undefined)
      ensure(
        Number.isFinite(p.dailyLimit) && p.dailyLimit > 0 && p.dailyLimit <= 1000,
        'Choose a daily limit above $0 and at most $1,000.',
      );
    if (p.maxOutputTokens !== undefined)
      ensure(
        Number.isInteger(p.maxOutputTokens) &&
          p.maxOutputTokens >= 256 &&
          p.maxOutputTokens <= 16000,
        'Output limit must be 256–16,000 tokens.',
      );
    const changed = p.model !== undefined && p.model !== this.config.model;
    for (const k of ['model', 'generationModel', 'reviewModel', 'dailyLimit', 'maxOutputTokens'])
      if (p[k] !== undefined) this.config[k] = p[k];
    if (changed) {
      this.config.validated = false;
      this.config.enabled = false;
    }
    this.persist();
    return this.status();
  }
  disable() {
    this.epoch++;
    this.config.enabled = false;
    this.config.validated = false;
    this.persist();
    this.active?.controller.abort();
    return this.status();
  }
  key() {
    let key;
    try {
      key = this.credentials.read();
    } catch {
      throw new ProviderError(
        'secure-storage',
        'The operating system could not unlock the stored key. Replace it in Settings.',
      );
    }
    if (!key) throw new ProviderError('missing-key', 'Add an API key in Settings.');
    return key;
  }
  async validate() {
    ensure(!this.active, 'A provider request is already active.');
    const epoch = this.epoch,
      model = this.config.model;
    const controller = new AbortController();
    const id = randomUUID();
    this.active = { id, controller };
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      await this.clientFactory(this.key()).models.retrieve(model, { signal: controller.signal });
      if (this.closed) return null;
      if (epoch !== this.epoch || controller.signal.aborted)
        throw new ProviderError('cancelled', 'Validation was cancelled.');
      this.config.validated = true;
      this.lastError = null;
      this.persist();
    } catch (e) {
      if (this.closed) return null;
      this.config.validated = false;
      this.persist();
      this.lastError = providerError(e).kind;
      throw providerError(e);
    } finally {
      clearTimeout(timer);
      if (this.active?.id === id) this.active = null;
    }
    return this.status();
  }
  async activate({ consent } = {}) {
    ensure(consent === true, 'Confirm AI context sharing and separate API billing.');
    ensure(this.config.dailyLimit > 0, 'Choose a daily spending limit before activation.');
    await this.validate();
    if (this.closed) return null;
    this.config.enabled = true;
    this.persist();
    try {
      const id = this.reserve({
        input: [{ role: 'user', content: 'Reply with OK.' }],
        instructions: 'Connection test.',
        inputBound: 128,
        maxOutputTokens: 256,
      });
      await this.run(id);
      if (this.closed) return null;
      const row = this.request(id);
      if (row.status !== 'completed')
        throw new ProviderError(
          this.lastError || 'incomplete',
          row.error || 'Connection test incomplete. Retry activation deliberately.',
        );
    } catch (e) {
      this.config.enabled = false;
      this.persist();
      throw e;
    }
    return this.status();
  }
  request(id) {
    return this.db.prepare('SELECT * FROM ai_requests WHERE id=?').get(id);
  }
  reserve({
    input,
    instructions,
    inputBound,
    maxOutputTokens = this.config.maxOutputTokens,
    conversationId = null,
    requestId = randomUUID(),
    context = {},
    model = this.config.model,
    operation = 'tutor',
    promptVersion = 'tutor-v1',
    schema = null,
    jobId = null,
  }) {
    ensure(
      this.config.enabled && this.config.validated,
      'Activate and validate AI in Settings first.',
    );
    ensure(!this.active, 'One provider request can run at a time.');
    this.key();
    const price = models.find((m) => m.id === model);
    ensure(
      price && Date.now() < Date.parse('2026-11-21T00:00:00Z'),
      'Verified pricing has expired. Update the app before paid requests.',
    );
    ensure(
      inputBound <= 16000 && inputBound > 0,
      'Reduce context to the 16,000-token input ceiling.',
    );
    ensure(
      !JSON.stringify({ input, instructions }).includes(this.key()),
      'Remove the API key from the question or context before sending.',
    );
    ensure(
      Number.isInteger(maxOutputTokens) && maxOutputTokens >= 256 && maxOutputTokens <= 16000,
      'Invalid output ceiling.',
    );
    const reserved = (inputBound * price.input * 1.25 + maxOutputTokens * price.output) / 1e6;
    this.store.transaction(() => {
      ensure(!this.request(requestId), 'This send was already recorded. Open its saved result.');
      if (jobId) {
        const hold = this.db
          .prepare('SELECT amount FROM generation_holds WHERE job_id=?')
          .get(jobId);
        ensure(hold && hold.amount + 1e-9 >= reserved, 'Generation reservation exhausted.');
        this.db
          .prepare('UPDATE generation_holds SET amount=MAX(0,amount-?) WHERE job_id=?')
          .run(reserved, jobId);
      }
      ensure(
        this.config.dailyLimit > 0 && this.usage().committed + reserved <= this.config.dailyLimit,
        'Daily spending limit reached, including unresolved usage. Adjust the limit in Settings.',
      );
      this.db
        .prepare(
          'INSERT INTO ai_requests(id,conversation_id,day,status,model,reserved,payload,context,created_at,pricing_version,prompt_version) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
        )
        .run(
          requestId,
          conversationId,
          new Date().toISOString().slice(0, 10),
          'reserved',
          price.id,
          reserved,
          JSON.stringify({
            input,
            instructions,
            max_output_tokens: maxOutputTokens,
            ...(schema
              ? { text: { format: { type: 'json_schema', name: operation, strict: true, schema } } }
              : {}),
          }),
          JSON.stringify(context),
          new Date().toISOString(),
          pricingVersion,
          promptVersion,
        );
      this.db
        .prepare('UPDATE ai_requests SET job_id=?,operation=? WHERE id=?')
        .run(jobId, operation, requestId);
      if (jobId) {
        const job = JSON.parse(
          this.db.prepare('SELECT data FROM generation_jobs WHERE id=?').get(jobId).data,
        );
        job.requests[operation] = requestId;
        this.db
          .prepare('UPDATE generation_jobs SET data=? WHERE id=?')
          .run(JSON.stringify(job), jobId);
      }
    });
    this.active = { id: requestId, controller: new AbortController(), epoch: this.epoch };
    return requestId;
  }
  async run(id, onText = () => {}) {
    const active = this.active;
    ensure(active?.id === id, 'Request is no longer active.');
    const row = this.request(id),
      payload = JSON.parse(row.payload);
    let text = '',
      terminal = false,
      refusal = false;
    const timer = setTimeout(() => active.controller.abort(), 120000);
    try {
      if (active.controller.signal.aborted || !this.config.enabled || active.epoch !== this.epoch)
        throw new ProviderError('cancelled', 'Request cancelled before dispatch.');
      const secret = this.key();
      const client = this.clientFactory(secret);
      this.db.prepare("UPDATE ai_requests SET status='submitted' WHERE id=?").run(id);
      const responsePromise = client.responses.create(
        {
          ...payload,
          model: row.model,
          stream: true,
          store: false,
          background: false,
          service_tier: 'default',
          reasoning: { effort: 'low' },
        },
        { signal: active.controller.signal },
      );
      const received =
        typeof responsePromise.withResponse === 'function'
          ? await responsePromise.withResponse()
          : { data: await responsePromise };
      if (this.closed) return;
      if (received.request_id)
        this.db
          .prepare('UPDATE ai_requests SET provider_request_id=? WHERE id=?')
          .run(received.request_id, id);
      const stream = received.data;
      for await (const event of stream) {
        if (this.closed) return;
        if (active.controller.signal.aborted)
          throw new ProviderError('cancelled', 'Stopped. Submitted work may still incur usage.');
        if (event.type === 'response.refusal.delta') refusal = true;
        if (event.type === 'response.created')
          this.db
            .prepare('UPDATE ai_requests SET provider_id=? WHERE id=?')
            .run(event.response.id, id);
        if (
          event.type === 'response.output_text.delta' ||
          event.type === 'response.refusal.delta'
        ) {
          text += event.delta;
          text = text.split(secret).join('[credential redacted]');
          ensure(Buffer.byteLength(text) <= 200000, 'Response exceeded the local size limit.');
          this.db
            .prepare("UPDATE ai_requests SET status='streaming',text=? WHERE id=?")
            .run(text, id);
          onText(text);
          this.notify({ id, conversationId: row.conversation_id });
        }
        if (['response.completed', 'response.incomplete', 'response.failed'].includes(event.type)) {
          terminal = true;
          const r = event.response,
            usage = r.usage;
          if (r.output?.some((item) => item.content?.some((part) => part.type === 'refusal')))
            refusal = true;
          const price = models.find((m) => m.id === row.model);
          const known =
            Number.isFinite(usage?.input_tokens) && Number.isFinite(usage?.output_tokens);
          const cached = Math.min(
            usage?.input_tokens || 0,
            usage?.input_tokens_details?.cached_tokens || 0,
          );
          const cost = known
            ? ((usage.input_tokens - cached) * price.input * 1.25 +
                cached * price.cached +
                usage.output_tokens * price.output) /
              1e6
            : null;
          if (event.type === 'response.completed') this.lastError = null;
          const status =
            event.type === 'response.completed'
              ? refusal
                ? 'refused'
                : 'completed'
              : event.type === 'response.incomplete'
                ? 'incomplete'
                : 'failed';
          this.db
            .prepare(
              'UPDATE ai_requests SET status=?,provider_id=?,input_tokens=?,output_tokens=?,cost=?,error=? WHERE id=?',
            )
            .run(
              status,
              r.id,
              known ? usage.input_tokens : null,
              known ? usage.output_tokens : null,
              cost,
              status === 'completed'
                ? null
                : 'Response did not finish. Retry only deliberately; prior work may be billed.',
              id,
            );
          break;
        }
        if (event.type === 'error')
          throw new ProviderError(
            'provider',
            'OpenAI interrupted the response. Review before retrying.',
          );
      }
      if (!terminal)
        throw new ProviderError(
          'interrupted',
          'The stream disconnected before completion. Usage is unknown.',
        );
    } catch (e) {
      if (this.closed) return;
      const safe = active.controller.signal.aborted
        ? new ProviderError(
            'cancelled',
            'Stopped or timed out. Submitted work may still incur usage.',
          )
        : providerError(e);
      const beforeDispatch = this.request(id).status === 'reserved';
      this.lastError = safe.kind;
      const rejected =
        !this.request(id).provider_id && [400, 401, 403, 404, 429].includes(e?.status);
      const retryHeader = e?.headers?.get?.('retry-after') ?? e?.headers?.['retry-after'];
      const retryAfter = retryHeader
        ? Number.isFinite(Number(retryHeader))
          ? Number(retryHeader) * 1000
          : Math.max(0, Date.parse(retryHeader) - Date.now())
        : 0;
      this.db
        .prepare('UPDATE ai_requests SET error_kind=?,retry_after=? WHERE id=?')
        .run(safe.kind, Number.isFinite(retryAfter) ? retryAfter : 0, id);
      if (['authentication', 'model-access', 'quota'].includes(safe.kind)) {
        this.config.enabled = false;
        this.config.validated = false;
        this.persist();
      }
      this.db
        .prepare('UPDATE ai_requests SET status=?,error=?,cost=? WHERE id=?')
        .run(
          safe.kind === 'cancelled' ? 'cancelled' : 'interrupted',
          safe.message,
          beforeDispatch || rejected ? 0 : null,
          id,
        );
    } finally {
      clearTimeout(timer);
      if (this.active?.id === id) this.active = null;
      if (!this.closed) this.notify({ id, conversationId: row.conversation_id });
    }
    return this.closed ? null : this.request(id);
  }
  cancel({ id } = {}) {
    ensure(this.active?.id === id, 'This request is not active.');
    this.active.controller.abort();
    return true;
  }
  close() {
    this.disable();
    this.closed = true;
  }
}
