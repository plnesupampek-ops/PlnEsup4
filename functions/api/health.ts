export const onRequest = async (): Promise<Response> => {
  return new Response(JSON.stringify({ status: "ok" }), {
    headers: { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
  });
};
