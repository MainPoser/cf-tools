export default {
  fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/api/") {
      return Response.json({
        name: "大业有成",
      });
    }
    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;