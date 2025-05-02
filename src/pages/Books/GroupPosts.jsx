import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiUrl } from "../../config/config";
import "./../../css/groupposts.css"; // Import the dark theme CSS

async function safeJson(res) {
  const text = await res.text();
  const ct = res.headers.get("Content-Type") || "";
  if (!ct.includes("application/json")) {
    throw new Error(`Expected JSON but got: ${text.slice(0, 200)}`);
  }
  return JSON.parse(text);
}

const GroupPosts = () => {
  const { id } = useParams();
  const groupId = parseInt(id, 10);

  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [expanded, setExpanded] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [editingComments, setEditingComments] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [liking, setLiking] = useState({});
  const [commenting, setCommenting] = useState({});
  const [updating, setUpdating] = useState({});

  useEffect(() => {
    if (!groupId || isNaN(groupId)) {
      setError("Invalid group ID");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${apiUrl}/books/groups/${groupId}/posts`, {
          credentials: "include",
        });
        const data = await safeJson(res);
        if (!res.ok) throw new Error(data.message || "Failed to load posts");

        const postsWithComments = (data.posts || []).map((p) => {
          const postUserName = p.user_name ?? p.username ?? "";
          const commentsArr = Array.isArray(p.comments)
            ? p.comments.map((c) => ({
                ...c,
                user_name: c.user_name ?? c.username ?? "",
              }))
            : [];

          commentsArr.sort(
            (a, b) => new Date(a.created_at) - new Date(b.created_at)
          );

          return {
            ...p,
            user_name: postUserName,
            commentsData: commentsArr,
          };
        });

        setPosts(postsWithComments);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId]);

  const toggleExpand = (postId) =>
    setExpanded((prev) => ({ ...prev, [postId]: !prev[postId] }));

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`${apiUrl}/books/groups/${groupId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: newPost.trim() }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.message || "Failed to post");

      const created = {
        ...data.post,
        user_name: data.user_name ?? data.username ?? "",
        commentsData: [],
      };

      setPosts((prev) => [created, ...prev]);
      setNewPost("");
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  const handleLikePost = async (postId) => {
    setLiking((l) => ({ ...l, [postId]: true }));
    try {
      const res = await fetch(
        `${apiUrl}/books/groups/${groupId}/posts/${postId}/like`,
        { method: "POST", credentials: "include" }
      );
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.message || "Failed to like post");

      setPosts((prev) =>
        prev.map((p) =>
          p.post_id === postId ? { ...p, likes: data.likes } : p
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLiking((l) => ({ ...l, [postId]: false }));
    }
  };

  const handleCommentSubmit = async (postId) => {
    const content = (commentInputs[postId] || "").trim();
    if (!content) return;
    setCommenting((c) => ({ ...c, [postId]: true }));
    try {
      const res = await fetch(
        `${apiUrl}/books/groups/${groupId}/posts/${postId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content }),
        }
      );
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.message || "Failed to post comment");

      const newComment = {
        ...data.comment,
        user_name: data.comment.user_name ?? data.comment.username ?? "",
      };

      setPosts((prev) =>
        prev.map((p) => {
          if (p.post_id !== postId) return p;
          const merged = [...p.commentsData, newComment].sort(
            (a, b) => new Date(a.created_at) - new Date(b.created_at)
          );
          return { ...p, commentsData: merged };
        })
      );
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    } catch (err) {
      setError(err.message);
    } finally {
      setCommenting((c) => ({ ...c, [postId]: false }));
    }
  };

  const handleUpdateComment = async (postId, commentId) => {
    const updatedContent = editingComments[commentId];
    if (!updatedContent.trim()) return;
    setUpdating((u) => ({ ...u, [commentId]: true }));
    try {
      const res = await fetch(
        `${apiUrl}/books/groups/${groupId}/posts/${postId}/comments/${commentId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content: updatedContent.trim() }),
        }
      );
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.message || "Failed to update comment");

      setPosts((prev) =>
        prev.map((p) => {
          if (p.post_id !== postId) return p;
          const updatedComments = p.commentsData.map((c) =>
            c.comment_id === commentId
              ? { ...c, content: data.comment.content }
              : c
          );
          return { ...p, commentsData: updatedComments };
        })
      );
      setEditingComments((ec) => {
        const newEditing = { ...ec };
        delete newEditing[commentId];
        return newEditing;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating((u) => ({ ...u, [commentId]: false }));
    }
  };

  if (loading) return <p className="loading">Loading posts…</p>;

  return (
    <div className="group-posts-container">
      <form onSubmit={handlePostSubmit} className="post-form">
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="What's on your mind?"
        />
        <button type="submit" disabled={posting}>
          {posting ? "Posting..." : "Post"}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {posts.length === 0 ? (
        <div className="no-posts">No posts yet.</div>
      ) : (
        posts.map((p) => {
          const comments = p.commentsData;
          return (
            <div key={p.post_id} className="group-post">
              <div className="timestamp">
                {new Date(p.created_at).toLocaleString()}
              </div>
              <div className="username">{p.user_name}</div>
              <p className="content">{p.content}</p>

              <div className="action-buttons">
                <button
                  onClick={() => handleLikePost(p.post_id)}
                  disabled={liking[p.post_id]}
                >
                  👍 Like ({p.likes || 0})
                </button>
                <button onClick={() => toggleExpand(p.post_id)}>
                  💬 Comment ({comments.length})
                </button>
              </div>

              {expanded[p.post_id] && (
                <div className="comments-section">
                  {comments.length > 0 ? (
                    comments.map((c) => (
                      <div key={c.comment_id} className="comment">
                        <strong>{c.user_name}</strong>:{" "}
                        {editingComments[c.comment_id] !== undefined ? (
                          <>
                            <input
                              value={editingComments[c.comment_id]}
                              onChange={(e) =>
                                setEditingComments((ec) => ({
                                  ...ec,
                                  [c.comment_id]: e.target.value,
                                }))
                              }
                            />
                            <button
                              onClick={() =>
                                handleUpdateComment(p.post_id, c.comment_id)
                              }
                              disabled={updating[c.comment_id]}
                            >
                              {updating[c.comment_id]
                                ? "Updating..."
                                : "Update"}
                            </button>
                          </>
                        ) : (
                          c.content
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="comment">No comments yet.</div>
                  )}
                  <div className="new-comment">
                    <textarea
                      value={commentInputs[p.post_id] || ""}
                      onChange={(e) =>
                        setCommentInputs((prev) => ({
                          ...prev,
                          [p.post_id]: e.target.value,
                        }))
                      }
                      placeholder="Write a comment..."
                    />
                    <button
                      onClick={() => handleCommentSubmit(p.post_id)}
                      disabled={commenting[p.post_id]}
                    >
                      {commenting[p.post_id] ? "Commenting..." : "Comment"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default GroupPosts;
