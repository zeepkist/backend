import { FastifyOtelInstrumentation } from '@fastify/otel';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
// import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
// import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
// import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { OPENTELEMETRY_COLLECTOR_URL, OPENTELEMETRY_SERVICE_NAME } from '../config';

// Configure OTLP Exporter
const traceExporter = new OTLPTraceExporter({
	url: OPENTELEMETRY_COLLECTOR_URL, // Signoz OpenTelemetry Collector
});

const metricExporter = new OTLPMetricExporter({
	url: OPENTELEMETRY_COLLECTOR_URL, // Signoz OpenTelemetry Collector
});

const sdk = new NodeSDK({
	resource: resourceFromAttributes({
		[ATTR_SERVICE_NAME]: OPENTELEMETRY_SERVICE_NAME ?? 'backend-dev',
	}),
	traceExporter,
	metricReader: new PeriodicExportingMetricReader({
		exporter: metricExporter,
		exportIntervalMillis: 60000, // Export metrics every 60 seconds
	}),
	instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

export const fastifyOtelInstrumentation = new FastifyOtelInstrumentation({
	servername: 'backend-fastify',
	registerOnInitialization: false,
});

process.on('SIGTERM', () => sdk.shutdown());
process.on('SIGINT', () => sdk.shutdown());
