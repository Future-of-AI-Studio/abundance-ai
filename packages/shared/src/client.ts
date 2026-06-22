import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CheckoutSessionRequest,
  CheckoutSessionResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
  ContentUploadRequest,
  ContentUploadResponse,
  ProgramBuildRequest,
  ProgramBuildResponse,
  ProgramUpdateRequest,
  ProgramUpdateResponse,
  MarketingGenerateRequest,
  MarketingGenerateResponse,
  MarketingUpdateRequest,
  MarketingUpdateResponse,
  SessionsSetLinkRequest,
  SessionsSetLinkResponse,
  StripeConnectRequest,
  StripeConnectResponse,
  MindsetCheckinRequest,
  MindsetCheckinResponse,
  MindsetChatRequest,
  MindsetChatResponse,
  MindsetReflectRequest,
  MindsetReflectResponse,
  CircleGetResponse,
  TestimonialCreateRequest,
  TestimonialCreateResponse,
  RefundRequestResponse,
  JourneyUpdateRequest,
} from './schemas/api.js';
import type { JourneyState } from './schemas/entities.js';

/** A typed, machine-readable error any client method may throw. */
export class AbundanceApiError extends Error {
  code: string;
  field?: string;
  constructor(code: string, message: string, field?: string) {
    super(message);
    this.name = 'AbundanceApiError';
    this.code = code;
    this.field = field;
  }
}

/**
 * The client interface both the live Edge-Function client and the frontend mock
 * adapter implement. One flag swaps between them (spec: "swap for the live calls
 * with one flag").
 */
export interface AbundanceClient {
  checkoutSession(req: CheckoutSessionRequest): Promise<CheckoutSessionResponse>;
  verifyPayment(req: VerifyPaymentRequest): Promise<VerifyPaymentResponse>;
  contentUploadUrl(req: ContentUploadRequest): Promise<ContentUploadResponse>;
  programBuild(req: ProgramBuildRequest): Promise<ProgramBuildResponse>;
  programUpdate(req: ProgramUpdateRequest): Promise<ProgramUpdateResponse>;
  marketingGenerate(req: MarketingGenerateRequest): Promise<MarketingGenerateResponse>;
  marketingUpdate(req: MarketingUpdateRequest): Promise<MarketingUpdateResponse>;
  sessionsSetLink(req: SessionsSetLinkRequest): Promise<SessionsSetLinkResponse>;
  stripeConnect(req: StripeConnectRequest): Promise<StripeConnectResponse>;
  mindsetCheckin(req: MindsetCheckinRequest): Promise<MindsetCheckinResponse>;
  mindsetChat(req: MindsetChatRequest): Promise<MindsetChatResponse>;
  mindsetReflect(req: MindsetReflectRequest): Promise<MindsetReflectResponse>;
  circleGet(): Promise<CircleGetResponse>;
  testimonialCreate(req: TestimonialCreateRequest): Promise<TestimonialCreateResponse>;
  refundRequest(): Promise<RefundRequestResponse>;
  journeyUpdate(req: JourneyUpdateRequest): Promise<JourneyState>;
}

/**
 * Live client — a thin wrapper over `supabase.functions.invoke`, which attaches
 * the user's Supabase JWT automatically. Unwraps the shared ApiError envelope
 * into a typed AbundanceApiError the UI can render inline.
 */
export function createApiClient(supabase: SupabaseClient): AbundanceClient {
  async function call<T>(fn: string, body?: unknown, method = 'POST'): Promise<T> {
    const { data, error } = await supabase.functions.invoke(fn, {
      body: body ?? {},
      method: method as 'POST' | 'GET' | 'PATCH' | 'PUT',
    });

    if (error) {
      // FunctionsHttpError carries the response; try to read our typed envelope.
      const anyErr = error as { context?: Response };
      if (anyErr.context && typeof anyErr.context.json === 'function') {
        try {
          const payload = (await anyErr.context.json()) as {
            error?: { code?: string; message?: string; field?: string };
          };
          if (payload?.error) {
            throw new AbundanceApiError(
              payload.error.code ?? 'unknown',
              payload.error.message ?? error.message,
              payload.error.field,
            );
          }
        } catch (e) {
          if (e instanceof AbundanceApiError) throw e;
        }
      }
      throw new AbundanceApiError('request_failed', error.message ?? 'Something went wrong.');
    }
    return data as T;
  }

  return {
    checkoutSession: (req) => call('checkout-session', req),
    verifyPayment: (req) => call('checkout-session/verify', req),
    contentUploadUrl: (req) => call('content-upload-url', req),
    programBuild: (req) => call('program-build', req),
    programUpdate: (req) => call('program-update', req, 'PATCH'),
    marketingGenerate: (req) => call('marketing-generate', req),
    marketingUpdate: (req) => call('marketing-update', req, 'PATCH'),
    sessionsSetLink: (req) => call('sessions-set-link', req, 'PUT'),
    stripeConnect: (req) => call('stripe-connect', req),
    mindsetCheckin: (req) => call('mindset-checkin', req),
    mindsetChat: (req) => call('mindset-chat', req),
    mindsetReflect: (req) => call('mindset-reflect', req),
    circleGet: () => call('circle-get', {}, 'GET'),
    testimonialCreate: (req) => call('testimonial-create', req),
    refundRequest: () => call('refund-request', {}),
    journeyUpdate: (req) => call('journey-update', req, 'PATCH'),
  };
}
