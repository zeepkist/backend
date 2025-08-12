import { trace } from "@opentelemetry/api"
import type {FastifyRequest, FastifyReply} from "fastify";
import { OPENTELEMETRY_SERVICE_NAME } from '../config';

const HEADERS_TO_COLLECT = [
    'X-Zeepkist-Version',
    'X-Zeepkist-Major-Version',
    'X-GTR-Version',
    'X-Steam-ID',
] as const;

/**
 * Fastify hook to collect specific headers from the request and attach them as attributes
 * to the current OpenTelemetry tracing span, if available.
 */
export function collectHeaderMetrics(request: FastifyRequest, _reply: FastifyReply, done: () => void) {
    const span = trace.getActiveSpan();

    if (span) {
        for (const header of HEADERS_TO_COLLECT) {
            const value = request.headers[header.toLowerCase()];
            if (value) {
                span.setAttribute(`${OPENTELEMETRY_SERVICE_NAME}.header.${header}`, value);
            }
        }
    }

    done();
}
