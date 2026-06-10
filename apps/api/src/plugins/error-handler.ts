import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";

interface ZodLike {
  issues: Array<{ message: string }>;
}

function isZodError(err: unknown): err is ZodLike {
  return (
    typeof err === "object" &&
    err !== null &&
    "issues" in err &&
    Array.isArray((err as ZodLike).issues)
  );
}

export default fp(async function errorHandlerPlugin(server: FastifyInstance) {
  server.setErrorHandler((error, _request, reply) => {
    if (isZodError(error)) {
      return reply.status(400).send({
        error: { code: "bad_request", message: error.issues.map((i) => i.message).join(", ") },
      });
    }
    const statusCode = error.statusCode ?? 500;
    const code =
      statusCode === 400
        ? "bad_request"
        : statusCode === 401
          ? "unauthorized"
          : statusCode === 404
            ? "not_found"
            : "internal_server_error";
    return reply.status(statusCode).send({ error: { code, message: error.message } });
  });
});
