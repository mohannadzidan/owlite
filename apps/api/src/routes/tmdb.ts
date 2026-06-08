import { FastifyInstance } from "fastify";

export default async function tmdbPlugin(fastify: FastifyInstance) {
  fastify.get("/tmdb/*", async (request, reply) => {
    const wildcard = (request.params as { "*": string })["*"];
    const search = request.url.includes("?") ? "?" + request.url.split("?")[1] : "";
    const upstreamUrl = `https://api.themoviedb.org/${wildcard}${search}`;
    const res = await fetch(upstreamUrl, {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        Accept: "application/json",
      },
    });

    const body = await res.text();
    reply
      .status(res.status)
      .header("Content-Type", res.headers.get("Content-Type") ?? "application/json")
      .send(body);
  });
}
