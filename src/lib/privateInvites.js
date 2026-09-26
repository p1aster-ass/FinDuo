// Preserve the existing error display while making failure explicit to callers.
export async function respondToInvite(answer, refresh, onError, id, status) {
  try {
    await answer(id, status);
    await refresh();
    return true;
  } catch (error) {
    onError(error);
    return false;
  }
}

// Room entry must follow a confirmed database update, never the button click.
export async function answerAndJoin(answer, id, status, invite, joinPrivate) {
  const success = await answer(id, status);
  if (success === true && status === "accepted" && invite?.id === id) {
    joinPrivate(`p:${id}`, invite);
  }
  return success;
}
