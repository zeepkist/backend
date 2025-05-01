// import { NodeSDK } from "@opentelemetry/sdk-node"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { resourceFromAttributes  } from "@opentelemetry/resources";
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { FastifyOtelInstrumentation } from '@fastify/otel';
import { OPENTELEMETRY_COLLECTOR_URL, OPENTELEMETRY_SERVICE_NAME } from '../config';

// Configure OTLP Exporter
const traceExporter = new OTLPTraceExporter({
	url: OPENTELEMETRY_COLLECTOR_URL, // Signoz OpenTelemetry Collector
});

const provider = new NodeTracerProvider({
	resource: resourceFromAttributes({
		[ATTR_SERVICE_NAME]: OPENTELEMETRY_SERVICE_NAME ?? "backend-dev",
	}),
	spanProcessors: [new BatchSpanProcessor(traceExporter)],
});

provider.register();

registerInstrumentations({
	tracerProvider: provider,
	instrumentations: [
		getNodeAutoInstrumentations()
	],
});

export const fastifyOtelInstrumentation = new FastifyOtelInstrumentation({
	servername: 'backend-fastify',
  registerOnInitialization: false,
});

fastifyOtelInstrumentation.setTracerProvider(provider)

process.on("SIGTERM", () => provider.shutdown())
process.on("SIGINT", () => provider.shutdown())
