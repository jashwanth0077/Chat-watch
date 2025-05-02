import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../../config/config";
import "../../css/groups.css";

const Groups = () => {
  const navigate = useNavigate();

  const [popularGroups, setPopularGroups] = useState([]);
  const [myGroups, setMyGroups]         = useState([]);
  const [groupStatus, setGroupStatus]   = useState({});
  const [error, setError]               = useState("");

  // New-group form state
  const [newName, setNewName]         = useState("");
  const [newDesc, setNewDesc]         = useState("");
  const [newIsPublic, setNewIsPublic] = useState(true);
  const [creating, setCreating]       = useState(false);

  // Fetch popular groups with debug logging
  const fetchPopular = async () => {
    try {
      const popularUrl = `${apiUrl}/books/groups/popular`;
      console.log("→ fetchPopular URL:", popularUrl);
      const res = await fetch(popularUrl, { credentials: "include" });
      console.log("→ fetchPopular status:", res.status);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${res.status}: ${txt}`);
      }
      const rawPopular = await res.clone().text();
      console.log("→ fetchPopular raw response:", rawPopular);
      const { popularGroups } = await res.json();
      console.log("→ fetchPopular parsed JSON:", popularGroups);
      setPopularGroups(popularGroups);

      // load access status for each
      const statusMap = {};
      await Promise.all(
        popularGroups.map(async (g) => {
          const sid = g.community_id;
          try {
            const r = await fetch(
              `${apiUrl}/books/groups/${sid}/access-status`,
              { credentials: "include" }
            );
            const json = r.ok ? await r.json() : {};
            statusMap[sid] = json.status || "none";
          } catch {
            statusMap[sid] = "none";
          }
        })
      );
      setGroupStatus(statusMap);
    } catch (err) {
      console.error("fetchPopular error:", err);
      setError("Unable to load popular groups. Please try again.");
    }
  };

 // Fetch “My Groups” from the backend
const fetchMyGroups = async () => {
  try {
    // 1) clear any old error
    setError("");

    // 2) hit your endpoint
    const myUrl = `${apiUrl}/books/my-groups`;
    console.log("→ fetchMyGroups URL:", myUrl);
    const res = await fetch(myUrl, { credentials: "include" });
    console.log("→ fetchMyGroups status:", res.status);

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`${res.status}: ${txt}`);
    }

    // 3) grab the raw text for debugging
    const raw = await res.clone().text();
    console.log("→ fetchMyGroups raw response:", raw);

    // 4) parse the JSON
    const json = await res.json();
    console.log("→ fetchMyGroups parsed JSON:", json);

    // 5) coerce into an array no matter what shape you get back
    let arr = [];
    if (Array.isArray(json)) {
      // backend returned a naked array
      arr = json;
    } else if (Array.isArray(json.myGroups)) {
      // backend wrapped it as { myGroups: [...] }
      arr = json.myGroups;
    } else if (Array.isArray(json.groups)) {
      // or maybe it's { groups: [...] }
      arr = json.groups;
    } else {
      console.warn("Unexpected shape for my-groups JSON, defaulting to empty array");
    }

    console.log("→ fetchMyGroups final array:", arr);

    // 6) set state
    setMyGroups(arr);

  } catch (err) {
    console.error("fetchMyGroups error:", err);
    setError("Unable to load your groups. Please try again.");
  }
};



  // Initial load
  useEffect(() => {
    fetchPopular();
    fetchMyGroups();
  }, []);

  // Request access to a private group
  const requestAccess = async (id) => {
    try {
      const res = await fetch(
        `${apiUrl}/books/groups/${id}/request-access`,
        { method: "POST", credentials: "include" }
      );
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt);
      }
      alert("Request sent");
      setGroupStatus((s) => ({ ...s, [id]: "requested" }));
    } catch (err) {
      console.error("requestAccess error:", err);
      alert("Could not send request: " + err.message);
    }
  };

  // Create a new group
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      alert("Group name is required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${apiUrl}/books/groups`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name:        newName.trim(),
          description: newDesc.trim(),
          isPublic:    newIsPublic
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${res.status}: ${txt}`);
      }
      // clear form and reload both lists
      setNewName("");
      setNewDesc("");
      setNewIsPublic(true);
      await Promise.all([fetchPopular(), fetchMyGroups()]);
    } catch (err) {
      console.error("handleCreate error:", err);
      alert("Could not create group: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="groups-container">
      {error && <div className="error">{error}</div>}

      <div className="groups-layout">
        {/* LEFT: Create + My Groups */}
        <div className="groups-left">
          <section className="create-group-section">
            <h2>Create a New Group</h2>
            <form onSubmit={handleCreate} className="group-form">
              <input
                type="text"
                placeholder="Group Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <textarea
                placeholder="Description (optional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
              <div className="visibility-options">
                <label>
                  <input
                    type="radio"
                    name="visibility"
                    checked={newIsPublic}
                    onChange={() => setNewIsPublic(true)}
                  />
                  Public
                </label>
                <label>
                  <input
                    type="radio"
                    name="visibility"
                    checked={!newIsPublic}
                    onChange={() => setNewIsPublic(false)}
                  />
                  Private
                </label>
              </div>
              <button type="submit" disabled={creating}>
                {creating ? "Creating…" : "Create Group"}
              </button>
            </form>
          </section>

          <section className="my-groups-section">
            <h2>My Groups</h2>
            {myGroups.length === 0 ? (
              <p>You haven't joined any groups yet.</p>
            ) : (
              myGroups.map((g) => (
                <div key={g.group_id} className="group-card">
                  <h3>{g.name}</h3>
                  <p>{g.description}</p>
                  <p>Role: {g.role}</p>
                  <button onClick={() => navigate(`/books/groups/${g.group_id}`)}>
                    Enter Group
                  </button>
                </div>
              ))
            )}
          </section>
        </div>

        {/* RIGHT: Popular Groups */}
        <div className="groups-right">
          <h2>Popular Groups</h2>
          {popularGroups.length === 0 ? (
            <p>No popular groups found.</p>
          ) : (
            popularGroups.map((g) => {
              const id        = g.community_id;
              const status    = groupStatus[id] || "none";
              const isPrivate = !g.is_public;

              return (
                <div key={id} className="group-card">
                  <h3>{g.name}</h3>
                  <p>{g.description}</p>

                  {status === "joined" || status === "admin" || !isPrivate ? (
                    <button onClick={() => navigate(`/books/groups/${id}`)}>
                      Enter Group
                    </button>
                  ) : status === "requested" ? (
                    <button disabled>Requested</button>
                  ) : (
                    <button onClick={() => requestAccess(id)}>
                      Request Access
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Groups;