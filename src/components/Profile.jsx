import { useState } from "react";
import Icon from "./Icon.jsx";
import PlayerAvatar from "./PlayerAvatar.jsx";
import ProfileForm, { RankEmblem, Section } from "./ProfileForm.jsx";
import {
  AVAILABILITY,
  AVAILABILITY_BY_ID,
  COMM_BY_ID,
  GAME_BY_ID,
  RANKS,
  REGION_BY_ID,
  ROLES,
} from "../data/options.js";
import { profileStrength } from "../lib/match.js";

const BIO_LIMIT = 160;

function toggle(list, value) {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function DetailCard({ title, icon, empty, children }) {
  return (
    <section className="detail-card glass-panel">
      <h2>
        <span className="section-icon">
          <Icon name={icon} />
        </span>
        {title}
      </h2>
      {children || <p className="detail-empty">{empty}</p>}
    </section>
  );
}

function ProfileEditor({ user, profile, onSave, onCancel }) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [roles, setRoles] = useState(profile.roles ?? []);
  const [availability, setAvailability] = useState(profile.availability ?? []);

  return (
    <ProfileForm
      initialProfile={profile}
      submitLabel="Save changes"
      onCancel={onCancel}
      onSubmit={(gaming) =>
        onSave({
          ...profile,
          ...gaming,
          displayName: displayName.trim() || user.displayName,
          bio: bio.trim(),
          roles,
          availability,
        })
      }
    >
      <Section
        id="about"
        icon="edit"
        title="About you"
        hint="Optional, but players with a bio and roles get more invites."
      >
        <div className="about-fields">
          <div className="form-field">
            <label htmlFor="profile-name">Display name</label>
            <div className="input-wrap">
              <Icon name="gamepad" />
              <input
                id="profile-name"
                value={displayName}
                maxLength={24}
                autoComplete="nickname"
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="profile-bio">Bio</label>
            <textarea
              id="profile-bio"
              className="bio-input"
              rows={3}
              maxLength={BIO_LIMIT}
              placeholder="What do you bring to the squad?"
              value={bio}
              aria-describedby="profile-bio-count"
              onChange={(event) => setBio(event.target.value)}
            />
            <p id="profile-bio-count" className="field-count">
              {bio.length}/{BIO_LIMIT}
            </p>
          </div>
          <fieldset className="pill-field">
            <legend>Favorite roles</legend>
            <div className="comm-list">
              {ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  className="comm-pill"
                  aria-pressed={roles.includes(role)}
                  onClick={() => setRoles((current) => toggle(current, role))}
                >
                  {role}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="pill-field">
            <legend>When you play</legend>
            <div className="comm-list">
              {AVAILABILITY.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  className="comm-pill"
                  aria-pressed={availability.includes(slot.id)}
                  onClick={() =>
                    setAvailability((current) => toggle(current, slot.id))
                  }
                >
                  <Icon name="calendar" />
                  {slot.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </Section>
    </ProfileForm>
  );
}

export default function Profile({ user, profile, onSave }) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const strength = profileStrength(profile);
  const rankLevel = RANKS.indexOf(profile.rank) + 1;

  function openEditor() {
    setSaved(false);
    setEditing(true);
    window.scrollTo(0, 0);
  }

  function save(next) {
    onSave(next);
    setEditing(false);
    setSaved(true);
    window.scrollTo(0, 0);
  }

  if (editing) {
    return (
      <>
        <div className="dashboard-heading">
          <div>
            <p className="eyebrow">EDIT PROFILE</p>
            <h1>
              More than a username<span className="brand-period">.</span>
            </h1>
          </div>
        </div>
        <ProfileEditor
          user={user}
          profile={profile}
          onSave={save}
          onCancel={() => setEditing(false)}
        />
      </>
    );
  }

  return (
    <>
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">YOUR PROFILE</p>
          <h1>
            More than a username<span className="brand-period">.</span>
          </h1>
        </div>
        <p className="save-note" role="status">
          {saved && (
            <>
              <Icon name="check" /> Profile saved
            </>
          )}
        </p>
      </div>

      <section className="profile-hero glass-panel" aria-labelledby="profile-name-title">
        <PlayerAvatar name={user.displayName} size="xl" variant="solid" />
        <div className="profile-hero-copy">
          <h2 id="profile-name-title">{user.displayName}</h2>
          <div className="player-meta">
            <span className="meta-chip">
              <RankEmblem level={rankLevel} />
              {profile.rank}
            </span>
            <span className="meta-chip">
              <Icon name="globe" />
              {REGION_BY_ID[profile.region]?.detail}
            </span>
          </div>
          <p className={profile.bio ? "profile-bio" : "profile-bio is-empty"}>
            {profile.bio || "No bio yet. Tell other players what you bring to the squad."}
          </p>
        </div>
        <button type="button" className="button button-primary" onClick={openEditor}>
          <Icon name="edit" />
          Edit profile
        </button>
      </section>

      <section className="strength-card glass-panel" aria-labelledby="strength-title">
        <div className="strength-top">
          <h2 id="strength-title">Profile strength</h2>
          <span className="strength-value">{strength.percent}%</span>
        </div>
        <div
          className="strength-track"
          role="progressbar"
          aria-labelledby="strength-title"
          aria-valuenow={strength.percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${strength.percent}%` }} />
        </div>
        {strength.tips.length > 0 ? (
          <div className="strength-tips">
            <p>Stand out in the feed:</p>
            <ul>
              {strength.tips.map((tip) => (
                <li key={tip}>
                  <button type="button" className="text-button" onClick={openEditor}>
                    {tip}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="strength-done">
            <Icon name="check" /> Your profile is complete. Nice.
          </p>
        )}
      </section>

      <div className="detail-grid">
        <DetailCard title="Games" icon="gamepad">
          <ul className="profile-games">
            {profile.games.map((id) => (
              <li key={id}>
                <span className="profile-game-tag">{GAME_BY_ID[id].tag}</span>
                <span>
                  <span className="profile-game-name">{GAME_BY_ID[id].name}</span>
                  <span className="profile-game-genre">{GAME_BY_ID[id].genre}</span>
                </span>
              </li>
            ))}
          </ul>
        </DetailCard>
        <DetailCard title="Comm style" icon="mic">
          <ul className="comm-inline">
            {profile.commStyles.map((id) => (
              <li key={id}>
                <Icon name={COMM_BY_ID[id].icon} />
                {COMM_BY_ID[id].label}
              </li>
            ))}
          </ul>
        </DetailCard>
        <DetailCard title="Favorite roles" icon="trophy" empty="No roles picked yet.">
          {profile.roles?.length > 0 && (
            <ul className="tag-list">
              {profile.roles.map((role) => (
                <li key={role} className="tag is-shared">
                  {role}
                </li>
              ))}
            </ul>
          )}
        </DetailCard>
        <DetailCard title="When you play" icon="calendar" empty="Add when you usually play.">
          {profile.availability?.length > 0 && (
            <ul className="tag-list">
              {profile.availability.map((id) => (
                <li key={id} className="tag is-shared">
                  {AVAILABILITY_BY_ID[id].label}
                </li>
              ))}
            </ul>
          )}
        </DetailCard>
      </div>
    </>
  );
}
