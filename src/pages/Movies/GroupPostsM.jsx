import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiUrl } from "../../config/config";
import "./../../css/groupposts.css";

// Helper to safely parse JSON responses
async function safeJson(res) {
  const text = await res.text();
  const ct = res.headers.get("Content-Type") || "";
  if (!ct.includes("application/json")) {
    throw new Error(`Expected JSON but got: ${text.slice(0, 200)}`);
  }
  return JSON.parse(text);
}

const MovieGroupPosts = () => {
  // Route parameters & navigation
  const { id } = useParams();
  const navigate = useNavigate();
  const groupId = parseInt(id, 10);

  // Component state declarations
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

  // Fetch posts on mount
  useEffect(() => {
    if (!groupId || isNaN(groupId)) {
      setError("Invalid group ID");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(
          `${apiUrl}/movies/groups/${groupId}/posts`,
          { credentials: "include" }
        );
        const data = await safeJson(res);
        if (!res.ok) throw new Error(data.message || "Failed to load posts");

        // Attach user names and comments
        const formatted = (data.posts || []).map((p) => ({
          ...p,
          user_name: p.user_name ?? p.username ?? "",
          liked: p.liked || false,
          commentsData: (p.comments || []).map((c) => ({
            ...c,
            user_name: c.user_name ?? c.username ?? ""
          })),
        }));

        setPosts(formatted);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId]);

  // Expand/collapse comments
  const toggleExpand = (postId) =>
    setExpanded((prev) => ({ ...prev, [postId]: !prev[postId] }));

  // Submit a new post
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    setPosting(true);

    try {
      const res = await fetch(
        `${apiUrl}/movies/groups/${groupId}/posts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content: newPost.trim() }),
        }
      );
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.message || "Failed to post");

      // Prepend newly created post
      setPosts((prev) => [
        {
          ...data.post,
          user_name: data.post.user_name ?? data.post.username ?? "",
          commentsData: [],
          liked: false,
          likes: 0,
        },
        ...prev,
      ]);
      setNewPost("");
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  // Toggle like/unlike on a post
  const handleToggleLike = async (postId, liked) => {
    setLiking((l) => ({ ...l, [postId]: true }));
    try {
      const method = liked ? "DELETE" : "POST";
      const res = await fetch(
        `${apiUrl}/movies/groups/${groupId}/posts/${postId}/like`,
        { method, credentials: "include" }
      );
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.message);

      setPosts((prev) =>
        prev.map((p) =>
          p.post_id === postId
            ? { ...p, likes: data.likes, liked: !liked }
            : p
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLiking((l) => ({ ...l, [postId]: false }));
    }
  };

  // Submit a new comment
  const handleCommentSubmit = async (postId) => {
    const content = (commentInputs[postId] || "").trim();
    if (!content) return;
    setCommenting((c) => ({ ...c, [postId]: true }));

    try {
      const res = await fetch(
        `${apiUrl}/movies/groups/${groupId}/posts/${postId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content }),
        }
      );
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.message);

      // Append newly created comment
      setPosts((prev) =>
        prev.map((p) =>
          p.post_id === postId
            ? { ...p, commentsData: [...p.commentsData, data.comment] }
            : p
        )
      );
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    } catch (err) {
      setError(err.message);
    } finally {
      setCommenting((c) => ({ ...c, [postId]: false }));
    }
  };

  // Edit an existing comment
  const handleUpdateComment = async (postId, commentId) => {
    const updatedContent = editingComments[commentId];
    if (!updatedContent.trim()) return;
    setUpdating((u) => ({ ...u, [commentId]: true }));

    try {
      const res = await fetch(
        `${apiUrl}/movies/groups/${groupId}/posts/${postId}/comments/${commentId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content: updatedContent.trim() }),
        }
      );
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.message);

      setPosts((prev) =>
        prev.map((p) => {
          if (p.post_id !== postId) return p;
          return {
            ...p,
            commentsData: p.commentsData.map((c) =>
              c.comment_id === commentId
                ? { ...c, content: data.comment.content }
                : c
            ),
          };
        })
      );
      setEditingComments((ec) => {
        const newEc = { ...ec };
        delete newEc[commentId];
        return newEc;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating((u) => ({ ...u, [commentId]: false }));
    }
  };

  // Show loading state
  if (loading) return <p className="loading">Loading posts…</p>;

  return (
    <div className="group-posts-container">
      {/* Post form */}
      <form onSubmit={handlePostSubmit} className="post-form">
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="What's on your mind?"
        />
        <button type="submit" disabled={posting}>
          {posting ? 'Posting...' : 'Post'}
        </button>
      </form>

      {/* Error message */}
      {error && <div className="error">{error}</div>}

      {/* Posts list */}
      {posts.length === 0 ? (
        <div className="no-posts">No posts yet.</div>
      ) : (
        posts.map((p) => (
          <div key={p.post_id} className="group-post">
            <div className="timestamp">
              {new Date(p.created_at).toLocaleString()}
            </div>
            <button
              className="username-link"
              onClick={() => navigate(`/movies/profile_page_not_for_friends/${p.user_name}`)}
            >
              {p.user_name}
            </button>
            <p className="content">{p.content}</p>

            {/* Action buttons */}
            <div className="action-buttons">
              <button className={p.liked ? 'liked' : ''} onClick={() => handleToggleLike(p.post_id, p.liked)} disabled={liking[p.post_id]}>
                {p.liked ? '💔 Unlike' : '👍 Like'} ({p.likes || 0})
              </button>
              <button onClick={() => toggleExpand(p.post_id)}>
                💬 Comment ({p.commentsData.length})
              </button>
            </div>

            {/* Comments section */}
            {expanded[p.post_id] && (
              <div className="comments-section">
                {p.commentsData.length > 0 ? (
                  p.commentsData.map((c) => (
                    <div key={c.comment_id} className="comment">
                      <strong>{c.user_name}</strong>: {' '}
                      {editingComments[c.comment_id] !== undefined ? (
                        <>                                    
                          <input
                            value={editingComments[c.comment_id]}
                            onChange={(e) => setEditingComments((ec) => ({ ...ec, [c.comment_id]: e.target.value }))}
                          />
                          <button onClick={() => handleUpdateComment(p.post_id, c.comment_id)} disabled={updating[c.comment_id]}>
                            {updating[c.comment_id] ? 'Updating...' : 'Update'}
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
                    value={commentInputs[p.post_id] || ''}
                    onChange={(e) => setCommentInputs((prev) => ({ ...prev, [p.post_id]: e.target.value }))}
                    placeholder="Write a comment..."
                  />
                  <button onClick={() => handleCommentSubmit(p.post_id)} disabled={commenting[p.post_id]}>
                    {commenting[p.post_id] ? 'Commenting...' : 'Comment'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default MovieGroupPosts;
