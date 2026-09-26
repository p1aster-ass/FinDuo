// Let the installed Neon SDK obtain/refresh the Data API JWT. Never persist it.
export async function getDataApiToken(auth) {
  if (!auth) return null;
  return await auth.getJWTToken();
}
