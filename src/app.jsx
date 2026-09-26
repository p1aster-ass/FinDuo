import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig } from "framer-motion";
// Base styles load first so component stylesheets can build on them.
import "./App.css";
import "./components/Hub.css";
import "./components/World.css";
import AuthForm from "./components/AuthForm.jsx";
import Messages from "./components/Messages.jsx";
import Onboarding from "./components/Onboarding.jsx";
import Profile from "./components/Profile.jsx";
import WorldStage from "./components/WorldStage.jsx";
import AtticIntro from "./components/world/AtticIntro.jsx";
import AvatarStudio from "./components/world/AvatarStudio.jsx";
import ChatBox from "./components/world/ChatBox.jsx";
import { EmoteBar, TouchPad } from "./components/world/Controls.jsx";
import Drawer from "./components/world/Drawer.jsx";
import Hud from "./components/world/Hud.jsx";
import InviteToasts from "./components/world/InviteToasts.jsx";
import LobbyDock from "./components/world/LobbyDock.jsx";
import PlayerCard from "./components/world/PlayerCard.jsx";
import RoomPanel from "./components/world/RoomPanel.jsx";
import ScreenPanel from "./components/world/ScreenPanel.jsx";
import { profileApi } from "./api/index.js";
import { backend } from "./api/backend.js";
import { useMultiplayer } from "./api/useMultiplayer.js";
import { usePresence } from "./api/usePresence.js";
import { avatarFor, randomAvatar } from "./data/avatar.js";
import { GAME_BY_ID } from "./data/options.js";
import { loadBlocked, saveBlocked } from "./lib/blocks.js";
import { latestBubbles } from "./lib/chat.js";
import { isProfileComplete, scoreMatch } from "./lib/match.js";
import { useMediaQuery } from "./lib/useMediaQuery.js";
import { useTheme } from "./lib/useTheme.js";
import { lobbySpawn, ROOM_SPAWN } from "./three/spawns.js";
import { placePlayer, queueSpawn } from "./three/localPlayer.js";

const PRIVATE_COLOR = "#8b6cff";

// Where you are: "lobby", one of your game ids, or "p:<id>" (a private room).
function resolveRoom(key, games) {
  const valid = key === "lobby" || games.includes(key) || key.startsWith("p:");
  return valid ? key : "lobby";
}

// FinDuo is one 3D world: an attic where you press the Gameboy to enter
// (signing in on its screen), an avatar studio, then a lobby you walk around
// with a door per game you play, each leading to that game's room. Clicking
// someone lets you invite them to a private room.
function App({ auth }) {
  // The gaming profile loads from public.profiles once the user is signed in.
  // `exists` says whether the user has a row yet; `stored` is false if the
  // table is missing on this branch, and the profile then lives in memory.
  const [record, setRecord] = useState({ userId: null });
  const [attempt, setAttempt] = useState(0);
  const [entered, setEntered] = useState(false);
  const [roomKey, setRoomKey] = useState("lobby");
  const [partners, setPartners] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [drawer, setDrawer] = useState(null);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [draftAvatar, setDraftAvatar] = useState(null);
  const [studioSaving, setStudioSaving] = useState(false);
  const [studioError, setStudioError] = useState("");
  const [blockVersion, setBlockVersion] = useState(0);
  const [dismissed, setDismissed] = useState(() => new Set());
  const studioMotion = useRef({ moving: false, emote: null, emoteAt: 0 });
  const theme = useTheme();
  const narrow = useMediaQuery("(max-width: 760px)");
  const userId = auth?.user?.id ?? null;
  const displayName = auth?.user?.displayName || "Player";

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    profileApi.load(userId).then(
      (result) => {
        if (!cancelled) setRecord({ userId, ...result, error: "" });
      },
      (error) => {
        if (!cancelled) setRecord({ userId, error: error.message });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  const loaded = userId !== null && record.userId === userId;
  const profile = loaded ? record.profile : null;
  // blockVersion re-reads the list after you block or unblock someone.
  const blocked = useMemo(
    () => (userId ? loadBlocked(userId) : new Set()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, blockVersion],
  );

  async function saveProfile({ displayName: name, ...changes }) {
    const next = { ...record.profile, ...changes };
    if (record.stored) {
      const shown = name ?? auth.user.displayName;
      if (record.exists) await profileApi.update(userId, shown, next);
      else await profileApi.create(userId, shown, next);
    }
    setRecord((current) => ({
      ...current,
      exists: current.stored,
      profile: next,
    }));
  }

  // New players have no row yet: their avatar waits for onboarding to save.
  async function saveAvatar(avatar) {
    if (record.stored && record.exists) {
      await saveProfile({ avatar });
    } else {
      setRecord((current) => ({
        ...current,
        profile: { ...current.profile, avatar },
      }));
    }
  }

  let phase = "attic";
  if (entered) {
    if (auth?.loading || (userId && !loaded)) phase = "loading";
    else if (!auth?.user) phase = "signin";
    else if (record.error) phase = "error";
    else if (!profile?.avatar || editingAvatar) phase = "studio";
    else if (!isProfileComplete(profile)) phase = "onboarding";
    else phase = "inside";
  }
  const inside = phase === "inside";
  const myGames = useMemo(
    () => (inside ? profile.games.filter((id) => GAME_BY_ID[id]) : []),
    [inside, profile],
  );

  const room = inside ? resolveRoom(roomKey, myGames) : null;
  const game = room && GAME_BY_ID[room] ? GAME_BY_ID[room] : null;
  const isPrivate = Boolean(room?.startsWith("p:"));
  let space = null;
  if (game)
    space = { id: game.id, name: game.name, tag: game.tag, color: game.color };
  if (isPrivate) {
    space = {
      id: room,
      name: "Private room",
      tag: "DUO",
      color: PRIVATE_COLOR,
    };
  }

  function goTo(key) {
    queueSpawn(key === "lobby" ? lobbySpawn(myGames, room) : ROOM_SPAWN);
    setSelectedId(null);
    setRoomKey(key);
  }

  function joinPrivate(key, invite) {
    const partner = invite.from === userId ? invite.toName : invite.fromName;
    setPartners((current) => ({ ...current, [key]: partner }));
    goTo(key);
  }

  const presence = usePresence({ userId, games: myGames, enabled: inside });
  const mp = useMultiplayer({
    userId,
    name: displayName,
    room,
    enabled: inside,
    onInviteAccepted: joinPrivate,
  });

  const peers = mp.peers.filter((peer) => !blocked.has(peer.id));
  const people = peers
    .map((peer) => ({
      peer,
      player: peer.player,
      avatar: peer.avatar,
      match: scoreMatch(profile, peer.player),
    }))
    .sort((a, b) => b.match.score - a.match.score);
  const messages = mp.messages.filter((m) => !blocked.has(m.userId));
  const bubbles = latestBubbles(messages);
  const selected = people.find(({ player }) => player.id === selectedId);
  const myInvite = selected
    ? mp.invites.find((i) => i.from === userId && i.to === selected.player.id)
    : null;

  // Door labels: who's in each room now, or (without multiplayer) who's online.
  const presenceCounts = {};
  for (const player of presence.players) {
    for (const id of player.games)
      presenceCounts[id] = (presenceCounts[id] ?? 0) + 1;
  }
  const doorLabels = {};
  for (const id of myGames) {
    const count = mp.available
      ? (mp.counts[id] ?? 0)
      : (presenceCounts[id] ?? 0);
    let unit = presence.presence ? "online" : "players";
    if (mp.available) unit = "here";
    doorLabels[id] = { text: `${count} ${unit}`, live: count > 0 };
  }
  const notes = [];
  if (mp.available === false) {
    notes.push(
      "Multiplayer isn’t set up yet, so you’re exploring on your own. Your team needs to run db/multiplayer.sql.",
    );
  }
  if (!record.stored && inside) {
    notes.push("Your profile isn’t saved on this server; it resets on reload.");
  }

  function toggleBlock(id) {
    const next = new Set(blocked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    saveBlocked(userId, next);
    setBlockVersion((v) => v + 1);
    if (!blocked.has(id)) setSelectedId(null);
  }

  async function answerInvite(id, status) {
    await mp.answer(id, status);
    if (status === "accepted") {
      const invite = mp.invites.find((item) => item.id === id);
      if (invite) joinPrivate(`p:${id}`, invite);
    }
  }

  async function signOut() {
    await auth.signOut();
    setDrawer(null);
    setRoomKey("lobby");
    setSelectedId(null);
    setEditingAvatar(false);
    setEntered(false);
    placePlayer(0, 3.4);
  }

  const studioAvatar =
    draftAvatar ?? profile?.avatar ?? avatarFor(userId ?? "");
  async function saveStudio() {
    setStudioSaving(true);
    setStudioError("");
    try {
      await saveAvatar(studioAvatar);
      setDraftAvatar(null);
      setEditingAvatar(false);
    } catch (error) {
      setStudioError(error.message);
    } finally {
      setStudioSaving(false);
    }
  }

  let scene = "attic";
  if (phase === "studio") scene = "studio";
  if (inside) scene = room === "lobby" ? "lobby" : "room";
  let shotName = scene;
  if (scene === "attic" && entered) shotName = "gameboy";
  if (scene === "studio" && narrow) shotName = "studioNarrow";
  const me = { id: userId, name: displayName, avatar: profile?.avatar };

  let placeSubtitle = "";
  if (space) {
    const count = people.length;
    placeSubtitle = isPrivate
      ? `Just you and ${partners[room] ?? "your duo"}`
      : `${count} ${count === 1 ? "other player" : "other players"} here`;
  }
  let chatTitle = "Lobby chat";
  if (space) chatTitle = isPrivate ? "Private chat" : `${space.name} chat`;

  function screenContent() {
    if (phase === "loading") {
      return (
        <p className="screen-status" role="status">
          Loading…
        </p>
      );
    }
    if (phase === "error") {
      return (
        <div className="screen-status" role="alert">
          <p>{record.error}</p>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              setRecord({ userId: null });
              setAttempt((count) => count + 1);
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return <AuthForm auth={auth} />;
  }

  return (
    <MotionConfig reducedMotion="user">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <WorldStage
        scene={scene}
        sceneKey={scene === "room" ? room : scene}
        shotName={shotName}
        theme={theme}
        hidden={phase === "onboarding"}
        attic={{ zoomed: entered, onPressGameboy: () => setEntered(true) }}
        studio={{ avatar: studioAvatar, motion: studioMotion }}
        lobby={{
          games: myGames.map((id) => GAME_BY_ID[id]),
          doorLabels,
          onEnterRoom: goTo,
          me,
          peers,
          bubbles,
          selectedId,
          onSelectPlayer: setSelectedId,
        }}
        room={{
          space,
          me,
          peers,
          bubbles,
          selectedId,
          onSelectPlayer: setSelectedId,
          onExit: () => goTo("lobby"),
        }}
      />

      {phase === "onboarding" ? (
        <Onboarding
          user={auth.user}
          initialProfile={profile}
          onComplete={saveProfile}
        />
      ) : (
        <div className="world-ui">
          <AnimatePresence mode="wait">
            {phase === "attic" && (
              <AtticIntro key="attic" onStart={() => setEntered(true)} />
            )}
            {["loading", "signin", "error"].includes(phase) && (
              <ScreenPanel key="screen" onBack={() => setEntered(false)}>
                {screenContent()}
              </ScreenPanel>
            )}
            {phase === "studio" && (
              <AvatarStudio
                key="studio"
                avatar={studioAvatar}
                isNew={!profile?.avatar}
                saving={studioSaving}
                error={studioError}
                onChange={(change) =>
                  setDraftAvatar({ ...studioAvatar, ...change })
                }
                onRandomize={() => setDraftAvatar(randomAvatar())}
                onEmote={(id) => {
                  studioMotion.current.emote = id;
                  studioMotion.current.emoteAt = Date.now();
                }}
                onSave={saveStudio}
                onCancel={() => {
                  setDraftAvatar(null);
                  setEditingAvatar(false);
                }}
              />
            )}
          </AnimatePresence>

          {inside && (
            <>
              <Hud
                user={auth.user}
                inRoom={room !== "lobby"}
                onLobby={() => goTo("lobby")}
                onOpen={(name) =>
                  name === "avatar" ? setEditingAvatar(true) : setDrawer(name)
                }
                onSignOut={signOut}
              />
              <main id="main-content" className="world-main" tabIndex={-1}>
                <AnimatePresence mode="wait">
                  {space ? (
                    <RoomPanel
                      key={room}
                      space={space}
                      subtitle={placeSubtitle}
                      people={people}
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                      onLobby={() => goTo("lobby")}
                    />
                  ) : (
                    <LobbyDock
                      key="lobby"
                      games={myGames.map((id) => GAME_BY_ID[id])}
                      labels={doorLabels}
                      notes={notes}
                      onEnterRoom={goTo}
                    />
                  )}
                </AnimatePresence>
                <ChatBox
                  key={room}
                  title={chatTitle}
                  messages={messages}
                  available={mp.available}
                  error={mp.error}
                  onSend={mp.send}
                  meId={userId}
                />
                <EmoteBar />
                <TouchPad />
                <AnimatePresence>
                  {selected && (
                    <PlayerCard
                      key={selected.player.id}
                      player={selected.player}
                      match={selected.match}
                      inviteStatus={myInvite?.status}
                      canInvite={mp.available === true && !isPrivate}
                      onInvite={() => mp.invite(selected.player.id)}
                      blocked={blocked.has(selected.player.id)}
                      onToggleBlock={() => toggleBlock(selected.player.id)}
                      onClose={() => setSelectedId(null)}
                    />
                  )}
                </AnimatePresence>
              </main>
              <InviteToasts
                invites={mp.invites}
                meId={userId}
                blocked={blocked}
                dismissed={dismissed}
                onAnswer={answerInvite}
                onDismiss={(id) =>
                  setDismissed((current) => new Set(current).add(id))
                }
              />
              <AnimatePresence>
                {drawer === "profile" && (
                  <Drawer
                    key="profile"
                    title="Your profile"
                    onClose={() => setDrawer(null)}
                  >
                    <Profile
                      user={{ ...auth.user, displayName }}
                      profile={profile}
                      onSave={saveProfile}
                      onUpdateDisplayName={auth.updateDisplayName}
                    />
                  </Drawer>
                )}
                {drawer === "messages" && (
                  <Drawer
                    key="messages"
                    title="Messages"
                    onClose={() => setDrawer(null)}
                  >
                    <Messages
                      profile={profile}
                      available={backend.messaging}
                      onFindPlayers={() => setDrawer(null)}
                    />
                  </Drawer>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      )}
    </MotionConfig>
  );
}
export default App;
