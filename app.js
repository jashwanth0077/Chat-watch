// backend/app.js
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcrypt");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const port = 4000;

// PostgreSQL connection
const pool = new Pool({
  user: 'test',
  host: 'localhost',
  database: 'ecommerce',
  password: 'test',
  port: 5432,
});

// Middleware configuration
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,              // ← make sure to send/receive cookies
  })
);

app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,  // 1 day
      sameSite: "lax",              // ← CHANGED: help with cross-site cookies
    },
  })
);

// Authentication middleware
function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  } else {
    return res.status(401).json({ message: "Unauthorized: Please log in first." });
  }
}

// ----------------------- AUTH ENDPOINTS -----------------------

app.post('/signup', async (req, res) => {
  const client = await pool.connect(); // get a dedicated client
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: 'All fields required' });

    await client.query('BEGIN');

    const exists = await client.query(
      'SELECT 1 FROM Users WHERE email = $1',
      [email]
    );
    if (exists.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 10);
    const insert = await client.query(
      'INSERT INTO Users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id',
      [username, email, hash]
    );
    const userId = insert.rows[0].user_id;
    await client.query(
      `INSERT INTO Profiles (user_id, email, dob, location, contact)
       VALUES ($1, $2, $3, 'remote', $4)`,
      [
        userId,
        email,      // you can choose to default this to Users.email or omit if you don’t need a public email
        null,       // dob       // location
        null        // contact
      ]
    );
    await client.query('COMMIT');

    req.session.userId = insert.rows[0].user_id;
    res.status(200).json({ userId: insert.rows[0].user_id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});


// Login endpoint

app.post("/login", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { email, password } = req.body;
    if (!email || !password) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Error: All fields are required." });
    }

    const userQuery = await client.query("SELECT * FROM Users WHERE email = $1", [email]);
    if (userQuery.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const user = userQuery.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    req.session.userId = user.user_id;

    await client.query("COMMIT");
    res.status(200).json({ message: "Login successful" });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Login Error:", error);
    res.status(500).json({ message: "Error logging in" });
  } finally {
    client.release();
  }
});

// Check login status
app.get("/isLoggedIn", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (!req.session.userId) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Not logged in" });
    }

    const userQuery = await client.query(
      "SELECT username FROM Users WHERE user_id = $1",
      [req.session.userId]
    );

    if (userQuery.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "User not found" });
    }

    const username = userQuery.rows[0].username;

    await client.query("COMMIT");
    res.status(200).json({ message: "Logged in", username });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error checking login status:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});


// Logout endpoint
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: "Failed to log out" });
    res.status(200).json({ message: "Logged out successfully" });
  });
});


// ====================== BOOKS ENDPOINTS ======================

// Search suggestions for books (by title or author)
app.get("/search-suggestions", isAuthenticated, async (req, res) => {
  const { query, type } = req.query;

  if (!query || !["book", "author"].includes(type)) {
    return res.status(400).json({ message: "Invalid query or type" });
  }

  const searchSQL =
    type === "book"
      ? `
        SELECT b.book_id, b.title, a.name AS author_name
        FROM Books b
        JOIN BookAuthors ba ON b.book_id = ba.book_id
        JOIN Authors a ON ba.author_id = a.author_id
        WHERE LOWER(b.title) LIKE LOWER('%' || $1 || '%')
        ORDER BY b.title ASC
        LIMIT 4;
      `
      : `
        SELECT b.book_id, b.title, a.name AS author_name
        FROM Books b
        JOIN BookAuthors ba ON b.book_id = ba.book_id
        JOIN Authors a ON ba.author_id = a.author_id
        WHERE LOWER(a.name) LIKE LOWER('%' || $1 || '%')
        ORDER BY a.name ASC
        LIMIT 4;
      `;

  const client = await pool.connect();
  try {
    const result = await client.query(searchSQL, [query]);
    res.status(200).json({ books: result.rows });
  } catch (err) {
    console.error("Search suggestion error:", err);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
});


// Books recommendations endpoint
app.get("/recommendations", isAuthenticated, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.session.userId;

    const query = `
      WITH UserShelfBooks AS (
        SELECT bbs.book_id
        FROM BookshelfBooks bbs
        JOIN Bookshelves bs ON bbs.bookshelf_id = bs.bookshelf_id
        WHERE bs.user_id = $1
      ),
      UserShelfAuthors AS (
        SELECT DISTINCT ba.author_id
        FROM BookAuthors ba
        WHERE ba.book_id IN (SELECT book_id FROM UserShelfBooks)
      ),
      UserShelfGenres AS (
        SELECT DISTINCT bg.genre_id
        FROM BookGenres bg
        WHERE bg.book_id IN (SELECT book_id FROM UserShelfBooks)
      )
      SELECT 
        b.book_id,
        b.title,
        b.publication_year,
        b.isbn,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('author_id', a.author_id, 'name', a.name))
          FILTER (WHERE a.author_id IS NOT NULL), '[]'
        ) AS authors,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('genre_id', g.genre_id, 'genre_name', g.genre_name))
          FILTER (WHERE g.genre_id IS NOT NULL), '[]'
        ) AS genres
      FROM Books b
      LEFT JOIN BookAuthors ba ON b.book_id = ba.book_id
      LEFT JOIN Authors a ON ba.author_id = a.author_id
      LEFT JOIN BookGenres bg ON b.book_id = bg.book_id
      LEFT JOIN Genres g ON bg.genre_id = g.genre_id
      WHERE b.book_id NOT IN (SELECT book_id FROM UserShelfBooks)
        AND (
          b.book_id IN (
             SELECT DISTINCT b2.book_id
             FROM Books b2
             JOIN BookAuthors ba2 ON b2.book_id = ba2.book_id
             WHERE ba2.author_id IN (SELECT author_id FROM UserShelfAuthors)
          )
          OR
          b.book_id IN (
             SELECT DISTINCT b3.book_id
             FROM Books b3
             JOIN BookGenres bg3 ON b3.book_id = bg3.book_id
             WHERE bg3.genre_id IN (SELECT genre_id FROM UserShelfGenres)
          )
        )
      GROUP BY b.book_id
      LIMIT 4;
    `;

    const result = await client.query(query, [userId]);
    res.status(200).json({
      message: "Recommendations fetched successfully",
      recommendations: result.rows,
    });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    res.status(500).json({ message: "Error fetching recommendations" });
  } finally {
    client.release();
  }
});

// Bookshelves endpoints
app.post("/bookshelves", isAuthenticated, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { name } = req.body;
    const userId = req.session.userId;

    const existing = await client.query(
      "SELECT 1 FROM Bookshelves WHERE user_id = $1 AND LOWER(name) = LOWER($2)",
      [userId, name]
    );
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "Bookshelf with this name already exists" });
    }

    const result = await client.query(
      "INSERT INTO Bookshelves (user_id, name) VALUES ($1, $2) RETURNING *",
      [userId, name]
    );

    await client.query("COMMIT");
    res.status(200).json({ message: "Bookshelf created", bookshelf: result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create shelf error:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});

app.get("/bookshelves", isAuthenticated, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userId = req.session.userId;

    const shelfRes = await client.query("SELECT * FROM Bookshelves WHERE user_id = $1", [userId]);
    const bookshelves = await Promise.all(
      shelfRes.rows.map(async (shelf) => {
        const booksRes = await client.query(
          `SELECT b.* FROM Books b
           JOIN BookshelfBooks bb ON b.book_id = bb.book_id
           WHERE bb.bookshelf_id = $1`,
          [shelf.bookshelf_id]
        );
        return { ...shelf, books: booksRes.rows };
      })
    );

    await client.query('COMMIT');

    res.status(200).json({ bookshelves });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Fetch shelves error:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});



app.get("/bookshelves/:bookshelf_id/books", isAuthenticated, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { bookshelf_id } = req.params;
    const result = await client.query(
      `SELECT b.* FROM Books b
       JOIN BookshelfBooks bb ON b.book_id = bb.book_id
       WHERE bb.bookshelf_id = $1`,
      [bookshelf_id]
    );

    await client.query('COMMIT');

    res.status(200).json({ books: result.rows });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Fetch books in shelf error:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});


app.post("/bookshelves/:bookshelf_id/books", isAuthenticated, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { bookshelf_id } = req.params;
    const { book_id } = req.body;
    const user_id = req.session.userId;

    const check = await client.query(
      "SELECT * FROM Bookshelves WHERE bookshelf_id = $1 AND user_id = $2",
      [bookshelf_id, user_id]
    );

    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: "Unauthorized or bookshelf not found" });
    }

    await client.query(
      `INSERT INTO BookshelfBooks (bookshelf_id, book_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [bookshelf_id, book_id]
    );

    await client.query('COMMIT');
    res.status(200).json({ message: "Book added to bookshelf" });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Add book error:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});


// Search books by title or author
app.get("/search-books", isAuthenticated, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { query } = req.query;
    if (!query) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: "Query required" });
    }

    const result = await client.query(
      `SELECT DISTINCT b.book_id, b.title, b.publication_year, b.isbn
       FROM Books b
       LEFT JOIN BookAuthors ba ON b.book_id = ba.book_id
       LEFT JOIN Authors a ON ba.author_id = a.author_id
       WHERE LOWER(b.title) LIKE LOWER('%' || $1 || '%')
          OR LOWER(a.name) LIKE LOWER('%' || $1 || '%')
       ORDER BY b.title ASC
       LIMIT 20`,
      [query]
    );

    await client.query('COMMIT');
    res.status(200).json({ books: result.rows });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Search books error:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});

// Genre endpoints for Books
app.get("/default-genres", isAuthenticated, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const genreQuery = await client.query(
      `SELECT * FROM Genres ORDER BY RANDOM() LIMIT 2`
    );

    const books_by_genre = {};
    for (const genre of genreQuery.rows) {
      const books = await client.query(
        `SELECT b.book_id, b.title, b.publication_year FROM Books b
         JOIN BookGenres bg ON b.book_id = bg.book_id
         WHERE bg.genre_id = $1`,
        [genre.genre_id]
      );
      books_by_genre[genre.genre_name] = books.rows;
    }

    await client.query('COMMIT');
    res.status(200).json({ genres: genreQuery.rows, books_by_genre });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error fetching default genres:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});


app.get("/search-genre", isAuthenticated, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { query } = req.query;
    if (!query) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: "Query required" });
    }

    const genreResult = await client.query(
      `SELECT * FROM Genres WHERE LOWER(genre_name) LIKE LOWER('%' || $1 || '%') LIMIT 1`,
      [query]
    );

    if (genreResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Genre not found" });
    }

    const genre = genreResult.rows[0];

    const booksResult = await client.query(
      `SELECT b.book_id, b.title, b.publication_year FROM Books b
       JOIN BookGenres bg ON b.book_id = bg.book_id
       WHERE bg.genre_id = $1`,
      [genre.genre_id]
    );

    await client.query('COMMIT');
    res.status(200).json({ genre, books: booksResult.rows });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error searching genre:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});


app.get("/genre-suggestions", isAuthenticated, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const query = req.query.query || "";
    const result = await client.query(
      `SELECT DISTINCT genre_name FROM Genres WHERE LOWER(genre_name) LIKE LOWER($1) LIMIT 5`,
      [`%${query}%`]
    );

    await client.query('COMMIT');
    res.json({ suggestions: result.rows.map(row => row.genre_name) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Genre suggestion error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});


app.get("/new-releases", isAuthenticated, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const currentYear = new Date().getFullYear();
    const result = await client.query(
      `SELECT * FROM Books
       WHERE publication_year >= $1
       ORDER BY publication_year DESC, book_id DESC
       LIMIT 10`,
      [currentYear - 1]
    );

    await client.query('COMMIT');
    res.status(200).json({ books: result.rows });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error fetching new releases:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});


// Choice awards for books
app.get("/choice-awards", isAuthenticated, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const query = `
      SELECT b.book_id, b.title, b.publication_year,
             COUNT(r.review_id) AS review_count,
             AVG(r.rating) AS avg_rating
      FROM Books b
      JOIN Reviews r ON b.book_id = r.book_id
      GROUP BY b.book_id
      HAVING COUNT(r.review_id) > 10 AND AVG(r.rating) > 4.5
      ORDER BY avg_rating DESC, review_count DESC
      LIMIT 10;
    `;
    
    const result = await client.query(query);
    const books = result.rows.map(book => ({
      ...book,
      avg_rating: book.avg_rating ? parseFloat(book.avg_rating) : null
    }));

    await client.query('COMMIT');
    res.status(200).json({ books });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error fetching choice awards:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});


// Book detail and review endpoints
app.get("/book/:bookId", isAuthenticated, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const bookId = parseInt(req.params.bookId, 10);
    const userId = req.session.userId;
    if (isNaN(bookId)) {
      return res.status(400).json({ message: "Invalid book ID" });
    }

    // 1) Fetch book and author info
    const bookRes = await client.query(
      `SELECT b.*, a.name AS author_name
         FROM Books b
         LEFT JOIN BookAuthors ba ON ba.book_id = b.book_id
         LEFT JOIN Authors a ON a.author_id = ba.author_id
         WHERE b.book_id = $1
         LIMIT 1`,
      [bookId]
    );
    if (!bookRes.rows.length) {
      return res.status(404).json({ message: "Book not found" });
    }
    const book = bookRes.rows[0];

    // 2) Fetch this user's review (if any)
    const userRev = await client.query(
      "SELECT rating, message FROM Reviews WHERE book_id = $1 AND user_id = $2",
      [bookId, userId]
    );
    const hasRated = userRev.rows.length > 0;
    const userRating = hasRated ? userRev.rows[0].rating : null;
    const reviewMessage = hasRated ? userRev.rows[0].message : "";

    // 3) Count total reviews
    const cntRes = await client.query(
      "SELECT COUNT(*) AS cnt FROM Reviews WHERE book_id = $1",
      [bookId]
    );
    const total = parseInt(cntRes.rows[0].cnt, 10);

    // 4) Calculate average rating if reviews exist
    let averageRating = null;
    if (total > 0) {
      const avgRes = await client.query(
        `SELECT ROUND(AVG(rating)::numeric, 2)::float FROM Reviews WHERE book_id = $1`,
        [bookId]
      );
      averageRating = Object.values(avgRes.rows[0])[0];
    }

    // 5) Fetch reviews (if total is <=5 then fetch all, else fetch top3 and bottom2)
    let reviews = [];
    if (total <= 5) {
      const allRes = await client.query(
        `SELECT r.review_id, r.rating, r.message, u.username
           FROM Reviews r
           JOIN Users u ON u.user_id = r.user_id
          WHERE r.book_id = $1
          ORDER BY r.review_date DESC`,
        [bookId]
      );
      reviews = allRes.rows;
    } else {
      const topRes = await client.query(
        `SELECT r.review_id, r.rating, r.message, u.username
           FROM Reviews r
           JOIN Users u ON u.user_id = r.user_id
          WHERE r.book_id = $1
          ORDER BY r.rating DESC, r.review_date DESC
          LIMIT 3`,
        [bookId]
      );
      let bottomRes;
      if (topRes.rows.length) {
        const topIds = topRes.rows.map(r => r.review_id);
        bottomRes = await client.query(
          `SELECT r.review_id, r.rating, r.message, u.username
             FROM Reviews r
             JOIN Users u ON u.user_id = r.user_id
            WHERE r.book_id = $1
              AND NOT (r.review_id = ANY($2::int[]))
            ORDER BY r.rating ASC, r.review_date DESC
            LIMIT 2`,
          [bookId, topIds]
        );
      } else {
        bottomRes = await client.query(
          `SELECT r.review_id, r.rating, r.message, u.username
             FROM Reviews r
             JOIN Users u ON u.user_id = r.user_id
            WHERE r.book_id = $1
            ORDER BY r.rating ASC, r.review_date DESC
            LIMIT 2`,
          [bookId]
        );
      }
      reviews = [...topRes.rows, ...bottomRes.rows];
    }

    // 6) Shuffle the reviews array
    for (let i = reviews.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [reviews[i], reviews[j]] = [reviews[j], reviews[i]];
    }

    // 7) Send the collected info back to the client
    await client.query('COMMIT');
    res.status(200).json({
      book: {
        book_id: book.book_id,
        title: book.title,
        publication_year: book.publication_year,
        isbn: book.isbn
      },
      author: { name: book.author_name || "Unknown" },
      hasRated,
      userRating,
      reviewMessage,
      averageRating,
      reviewCount: total,
      reviews
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error fetching book details:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});


// Submit a rating (and review) for a book
app.post("/book/:bookId/rate", isAuthenticated, async (req, res) => {
  const client = await pool.connect(); // Get a client from the pool
  try {
    await client.query('BEGIN'); // Start the transaction

    const bookId = parseInt(req.params.bookId, 10);
    const userId = req.session.userId;
    const { rating, message } = req.body;
    if (isNaN(bookId) || ![1, 2, 3, 4, 5].includes(rating)) {
      return res.status(400).json({ message: "Invalid input" });
    }

    // Check to prevent double-rating
    const exists = await client.query(
      "SELECT 1 FROM Reviews WHERE book_id = $1 AND user_id = $2",
      [bookId, userId]
    );
    if (exists.rows.length) {
      return res.status(409).json({ message: "Already rated" });
    }

    // Insert the new review
    await client.query(
      `INSERT INTO Reviews (book_id, user_id, rating, message)
       VALUES ($1, $2, $3, $4)`,
      [bookId, userId, rating, message || null]
    );

    // Recalculate total reviews
    const cntRes = await client.query(
      "SELECT COUNT(*) AS cnt FROM Reviews WHERE book_id = $1",
      [bookId]
    );
    const total = parseInt(cntRes.rows[0].cnt, 10);

    // Recalculate average rating
    let averageRating = null;
    if (total > 0) {
      const avgRes = await client.query(
        `SELECT ROUND(AVG(rating)::numeric, 2)::float FROM Reviews WHERE book_id = $1`,
        [bookId]
      );
      averageRating = Object.values(avgRes.rows[0])[0];
    }

    // Fetch updated reviews (similar strategy as above)
    let reviews = [];
    if (total <= 5) {
      const allRes = await client.query(
        `SELECT r.review_id, r.rating, r.message, u.username
           FROM Reviews r
           JOIN Users u ON u.user_id = r.user_id
          WHERE r.book_id = $1
          ORDER BY r.review_date DESC`,
        [bookId]
      );
      reviews = allRes.rows;
    } else {
      const topRes = await client.query(
        `SELECT r.review_id, r.rating, r.message, u.username
           FROM Reviews r
           JOIN Users u ON u.user_id = r.user_id
          WHERE r.book_id = $1
          ORDER BY r.rating DESC, r.review_date DESC
          LIMIT 3`,
        [bookId]
      );
      let bottomRes;
      if (topRes.rows.length) {
        const topIds = topRes.rows.map(r => r.review_id);
        bottomRes = await client.query(
          `SELECT r.review_id, r.rating, r.message, u.username
             FROM Reviews r
             JOIN Users u ON u.user_id = r.user_id
            WHERE r.book_id = $1
              AND NOT (r.review_id = ANY($2::int[]))
            ORDER BY r.rating ASC, r.review_date DESC
            LIMIT 2`,
          [bookId, topIds]
        );
      } else {
        bottomRes = await client.query(
          `SELECT r.review_id, r.rating, r.message, u.username
             FROM Reviews r
             JOIN Users u ON u.user_id = r.user_id
            WHERE r.book_id = $1
            ORDER BY r.rating ASC, r.review_date DESC
            LIMIT 2`,
          [bookId]
        );
      }
      reviews = [...topRes.rows, ...bottomRes.rows];
    }

    // Shuffle the reviews array
    for (let i = reviews.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [reviews[i], reviews[j]] = [reviews[j], reviews[i]];
    }

    // Commit the transaction
    await client.query('COMMIT');
    
    res.status(200).json({
      message: "Rating submitted",
      averageRating,
      reviewCount: total,
      reviews,
      hasRated: true,
      userRating: rating,
      reviewMessage: message || ""
    });
  } catch (error) {
    // Rollback in case of an error
    await client.query('ROLLBACK');
    console.error("Error submitting rating:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    // Release the client back to the pool
    client.release();
  }
});


// ====================== MOVIES ENDPOINTS ======================

// Search suggestions for movies (by title or director)
app.get("/search-movies", isAuthenticated, async (req, res) => {
  const { query, type } = req.query;
  if (!query || !["movie", "director"].includes(type)) {
    return res.status(400).json({ message: "Invalid query or type" });
  }

  const searchSQL =
    type === "movie"
      ? `SELECT movie_id, title, release_year 
         FROM Movies 
         WHERE LOWER(title) LIKE LOWER('%' || $1 || '%') 
         ORDER BY title ASC LIMIT 4;`
      : `SELECT m.movie_id, m.title, d.name AS director_name 
         FROM Movies m 
         JOIN Directors d ON m.director_id = d.director_id 
         WHERE LOWER(d.name) LIKE LOWER('%' || $1 || '%') 
         ORDER BY d.name ASC LIMIT 4;`;

  const client = await pool.connect(); // Get a client from the pool
  try {
    await client.query('BEGIN'); // Start the transaction

    // Execute the query inside the transaction
    const result = await client.query(searchSQL, [query]);

    // Commit the transaction (though not strictly necessary for a read operation)
    await client.query('COMMIT');

    // Respond with the search results
    res.status(200).json({ movies: result.rows });
  } catch (err) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error("Movie search error:", err);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    // Release the client back to the pool
    client.release();
  }
});


// Movies recommendations endpoint
app.get("/movies/recommendations", isAuthenticated, async (req, res) => {
  const client = await pool.connect(); // Get a client from the pool
  try {
    const userId = req.session.userId;

    // Begin the transaction
    await client.query('BEGIN');

    // Get movie IDs from the user's collections
    const userCollectionsRes = await client.query(
      `SELECT movie_id 
       FROM CollectionMovies cm 
       JOIN MovieCollections mc ON cm.collection_id = mc.collection_id 
       WHERE mc.user_id = $1`,
      [userId]
    );
    const collectionMovieIds = userCollectionsRes.rows.map((row) => row.movie_id);

    // Get distinct genre IDs from the movies in the user's collections
    const userGenresRes = await client.query(
      `SELECT DISTINCT genre_id 
       FROM MovieGenres 
       WHERE movie_id = ANY($1::int[])`,
      [collectionMovieIds]
    );
    const genreIds = userGenresRes.rows.map((row) => row.genre_id);

    // Select recommended movies that are not already in the user's collection but share a genre
    const recResult = await client.query(
      `SELECT DISTINCT m.movie_id, m.title, m.release_year 
       FROM Movies m 
       JOIN MovieGenres mg ON m.movie_id = mg.movie_id 
       WHERE m.movie_id != ALL($1::int[]) 
       AND mg.genre_id = ANY($2::int[]) 
       LIMIT 4`,
      [collectionMovieIds, genreIds]
    );

    // Commit the transaction
    await client.query('COMMIT');

    // Respond with the recommendations
    res.status(200).json({
      message: "Recommendations fetched successfully",
      recommendations: recResult.rows,
    });
  } catch (error) {
    // Rollback in case of an error
    await client.query('ROLLBACK');
    console.error("Error fetching recommendations:", error);
    res.status(500).json({ message: "Error fetching recommendations" });
  } finally {
    // Release the client back to the pool
    client.release();
  }
});

// Create a new collection
app.post("/movie-collections", isAuthenticated, async (req, res) => {
  const client = await pool.connect(); // Get a client from the pool
  const userId = req.session.userId;
  const { name } = req.body;

  if (!name) return res.status(400).json({ message: "Collection name required" });

  try {
    // Begin the transaction
    await client.query('BEGIN');

    // Check if the collection name already exists
    const exists = await client.query(
      `SELECT 1 FROM MovieCollections WHERE user_id = $1 AND LOWER(name) = LOWER($2)`,
      [userId, name]
    );
    if (exists.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: "Collection name already exists" });
    }

    // Insert the new collection
    const insert = await client.query(
      `INSERT INTO MovieCollections (user_id, name) VALUES ($1, $2) RETURNING collection_id, name`,
      [userId, name]
    );

    // Commit the transaction
    await client.query('COMMIT');

    // Respond with the new collection
    res.status(201).json({ collection: insert.rows[0] });
  } catch (err) {
    // Rollback in case of an error
    await client.query('ROLLBACK');
    console.error("Create collection error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    // Release the client back to the pool
    client.release();
  }
});



// GET /movie-collections
app.get("/movie-collections", isAuthenticated, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT collection_id, name
         FROM MovieCollections
        WHERE user_id = $1
     ORDER BY created_at DESC`,    // ← column name fixed here
      [req.session.userId]
    );
    res.json({ collections: rows });
  } catch (err) {
    console.error("Fetch collections error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// Get movies in a collection
app.get("/movie-collections/:collectionId/movies", isAuthenticated, async (req, res) => {
  const client = await pool.connect(); // Get a client from the pool
  const userId = req.session.userId;
  const collectionId = parseInt(req.params.collectionId, 10);

  if (isNaN(collectionId)) return res.status(400).json({ message: "Invalid collection ID" });

  try {
    // Begin the transaction
    await client.query('BEGIN');

    // Check if the collection exists and belongs to the user
    const ok = await client.query(
      `SELECT 1 FROM MovieCollections WHERE collection_id = $1 AND user_id = $2`,
      [collectionId, userId]
    );
    if (!ok.rows.length) {
      await client.query('ROLLBACK'); // Rollback if not authorized
      return res.status(403).json({ message: "Not authorized" });
    }

    // Fetch the movies in the collection
    const movies = await client.query(
      `SELECT m.movie_id, m.title, m.release_year 
         FROM CollectionMovies cm 
         JOIN Movies m ON cm.movie_id = m.movie_id 
        WHERE cm.collection_id = $1`,
      [collectionId]
    );

    // Commit the transaction
    await client.query('COMMIT');

    // Send the response with the movie data
    res.json({ movies: movies.rows });

  } catch (err) {
    // Rollback in case of an error
    await client.query('ROLLBACK');
    console.error("Fetch collection movies error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    // Release the client back to the pool
    client.release();
  }
});


// Add a movie to a collection
app.post("/movie-collections/:collectionId/movies", isAuthenticated, async (req, res) => {
  const client = await pool.connect(); // Get a client from the pool
  const userId = req.session.userId;
  const collectionId = parseInt(req.params.collectionId, 10);
  const { movie_id } = req.body;

  if (isNaN(collectionId) || !movie_id) {
    return res.status(400).json({ message: "Invalid input" });
  }

  try {
    // Begin the transaction
    await client.query('BEGIN');

    // Check if the collection exists and belongs to the user
    const ok = await client.query(
      `SELECT 1 FROM MovieCollections WHERE collection_id = $1 AND user_id = $2`,
      [collectionId, userId]
    );
    if (!ok.rows.length) {
      await client.query('ROLLBACK'); // Rollback if not authorized
      return res.status(403).json({ message: "Not authorized" });
    }

    // Insert the movie into the collection, ensuring no duplicates with ON CONFLICT
    await client.query(
      `INSERT INTO CollectionMovies (collection_id, movie_id) 
         VALUES ($1, $2) 
         ON CONFLICT DO NOTHING`,
      [collectionId, movie_id]
    );

    // Commit the transaction
    await client.query('COMMIT');

    // Send a response indicating success
    res.json({ message: "Movie added to collection" });

  } catch (err) {
    // Rollback in case of an error
    await client.query('ROLLBACK');
    console.error("Add movie to collection error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    // Release the client back to the pool
    client.release();
  }
});



// GET detailed movie info
app.get('/movie/:movieId', isAuthenticated, async (req, res) => {
  const client = await pool.connect(); // Get a client from the pool
  const userId = req.session.userId;
  const movieId = parseInt(req.params.movieId, 10);
  
  if (isNaN(movieId)) return res.status(400).json({ message: 'Invalid movie ID' });

  try {
    // Begin the transaction
    await client.query('BEGIN');

    // 1) Movie + director + lead actor/actress
    const { rows: [movie] } = await client.query(
      `SELECT 
         m.*, 
         d.name AS director_name,
         a1.name AS lead_actor_name,
         a2.name AS lead_actress_name
       FROM Movies m
         JOIN Directors d ON m.director_id = d.director_id
         LEFT JOIN Actors a1 ON m.lead_actor_id   = a1.actor_id
         LEFT JOIN Actors a2 ON m.lead_actress_id = a2.actor_id
       WHERE m.movie_id = $1`,
      [movieId]
    );
    if (!movie) {
      await client.query('ROLLBACK'); // Rollback if movie not found
      return res.status(404).json({ message: 'Movie not found' });
    }

    // 2) Genres
    const { rows: genres } = await client.query(
      `SELECT g.genre_name
         FROM MovieGenres mg
         JOIN Genres g ON mg.genre_id = g.genre_id
        WHERE mg.movie_id = $1`,
      [movieId]
    );
    movie.genres = genres.map(r => r.genre_name);

    // 3) User’s review (if any)
    const { rows: [userRev] } = await client.query(
      `SELECT rating, message
         FROM MovieReviews
        WHERE movie_id = $1 AND user_id = $2`,
      [movieId, userId]
    );
    const hasRated      = Boolean(userRev);
    const userRating    = userRev?.rating  ?? null;
    const reviewMessage = userRev?.message ?? null;

    // 4) Totals & average
    const { rows: [{ cnt, avg }] } = await client.query(
      `SELECT COUNT(*) AS cnt,
              ROUND(AVG(rating)::numeric,2)::float AS avg
         FROM MovieReviews
        WHERE movie_id = $1`,
      [movieId]
    );
    const totalReviews  = parseInt(cnt, 10);
    const averageRating = avg;

    // 5) Latest 5 reviews
    const { rows: reviews } = await client.query(
      `SELECT r.review_id, r.rating, r.message, u.username
         FROM MovieReviews r
         JOIN Users u ON r.user_id = u.user_id
        WHERE r.movie_id = $1
        ORDER BY r.review_date DESC
        LIMIT 5`,
      [movieId]
    );

    // Commit the transaction
    await client.query('COMMIT');

    res.json({
      movie,
      hasRated,
      userRating,
      reviewMessage,
      averageRating,
      totalReviews,
      reviews
    });
  } catch (err) {
    // Rollback in case of an error
    await client.query('ROLLBACK');
    console.error('GET /movie error:', err.stack);
    res.status(500).json({ message: err.message });
  } finally {
    // Release the client back to the pool
    client.release();
  }
});


// POST new review
app.post('/movie/:movieId/review', isAuthenticated, async (req, res) => {
  const client = await pool.connect(); // Get a client from the pool
  const userId = req.session.userId;
  const movieId = parseInt(req.params.movieId, 10);
  const { rating, message } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5' });
  }

  try {
    // Begin the transaction
    await client.query('BEGIN');

    // 1) Insert the review into the database
    await client.query(
      `INSERT INTO MovieReviews (movie_id, user_id, rating, message)
       VALUES ($1, $2, $3, $4)`,
      [movieId, userId, rating, message || null]
    );

    // 2) Recompute aggregates
    const { rows: [{ cnt, avg }] } = await client.query(
      `SELECT COUNT(*) AS cnt,
              ROUND(AVG(rating)::numeric,2)::float AS avg
         FROM MovieReviews
        WHERE movie_id = $1`,
      [movieId]
    );
    const totalReviews  = parseInt(cnt, 10);
    const averageRating = avg;

    // 3) Fetch the latest 5 reviews
    const { rows: reviews } = await client.query(
      `SELECT r.review_id, r.rating, r.message, u.username
         FROM MovieReviews r
         JOIN Users u ON r.user_id = u.user_id
        WHERE r.movie_id = $1
        ORDER BY r.review_date DESC
        LIMIT 5`,
      [movieId]
    );

    // Commit the transaction
    await client.query('COMMIT');

    res.json({
      averageRating,
      totalReviews,
      reviews,
      hasRated: true,
      userRating: rating,
      reviewMessage: message
    });
  } catch (err) {
    // Rollback in case of an error
    await client.query('ROLLBACK');
    console.error('POST /movie review error:', err.stack);
    res.status(500).json({ message: err.message });
  } finally {
    // Release the client back to the pool
    client.release();
  }
});


// =============================================
// MOVIE GENRE ENDPOINTS
// =============================================

// 1. Fetch default movie genres + a sample of movies for each
app.get("/movies/default-genres", isAuthenticated, async (req, res) => {
  const client = await pool.connect(); // Get a client from the pool
  try {
    // Begin the transaction
    await client.query('BEGIN');

    // 1) Get random genres
    const genreRes = await client.query(
      `SELECT * FROM Genres ORDER BY RANDOM() LIMIT 2`
    );

    const movies_by_genre = {};

    // 2) For each genre, fetch movies related to that genre
    for (const genre of genreRes.rows) {
      const moviesRes = await client.query(
        `SELECT m.movie_id, m.title, m.release_year
           FROM Movies m
           JOIN MovieGenres mg ON m.movie_id = mg.movie_id
          WHERE mg.genre_id = $1
          ORDER BY m.title ASC`,
        [genre.genre_id]
      );
      movies_by_genre[genre.genre_name] = moviesRes.rows;
    }

    // Commit the transaction
    await client.query('COMMIT');

    res.status(200).json({ genres: genreRes.rows, movies_by_genre });
  } catch (error) {
    // Rollback in case of an error
    await client.query('ROLLBACK');
    console.error("Error fetching default movie genres:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    // Release the client back to the pool
    client.release();
  }
});


// 2. Autocomplete suggestions for movie genres
app.get("/movies/genre-suggestions", isAuthenticated, async (req, res) => {
  const client = await pool.connect(); // Get a client from the pool
  try {
    // Begin the transaction
    await client.query('BEGIN');

    const q = (req.query.query || "").trim();
    if (!q) return res.json({ suggestions: [] });

    const result = await client.query(
      `SELECT DISTINCT genre_name
         FROM Genres
        WHERE LOWER(genre_name) LIKE LOWER($1)
        ORDER BY genre_name ASC
        LIMIT 5`,
      [`%${q}%`]
    );

    // Commit the transaction
    await client.query('COMMIT');

    res.status(200).json({ suggestions: result.rows.map(r => r.genre_name) });
  } catch (err) {
    // Rollback in case of an error
    await client.query('ROLLBACK');
    console.error("Movie genre suggestion error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    // Release the client back to the pool
    client.release();
  }
});


// 3. Search movies by genre name
app.get("/movies/search-genre", isAuthenticated, async (req, res) => {
  const client = await pool.connect(); // Get a client from the pool
  try {
    // Begin the transaction
    await client.query('BEGIN');

    const q = (req.query.query || "").trim();
    if (!q) return res.status(400).json({ message: "Query required" });

    // Find the genre
    const genreResult = await client.query(
      `SELECT * FROM Genres
        WHERE LOWER(genre_name) LIKE LOWER($1)
        LIMIT 1`,
      [`%${q}%`]
    );
    if (genreResult.rows.length === 0) {
      return res.status(404).json({ message: "Genre not found" });
    }
    const genre = genreResult.rows[0];

    // Fetch all movies in that genre
    const moviesResult = await client.query(
      `SELECT m.movie_id, m.title, m.release_year
         FROM Movies m
         JOIN MovieGenres mg ON m.movie_id = mg.movie_id
        WHERE mg.genre_id = $1
        ORDER BY m.title ASC`,
      [genre.genre_id]
    );

    // Commit the transaction
    await client.query('COMMIT');

    res.status(200).json({ genre, movies: moviesResult.rows });
  } catch (error) {
    // Rollback in case of an error
    await client.query('ROLLBACK');
    console.error("Error searching movie genre:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    // Release the client back to the pool
    client.release();
  }
});


// ─── New Releases for Movies ───────────────────────────────────────────────────
app.get("/movies/new-releases", isAuthenticated, async (req, res) => {
  const client = await pool.connect(); // Get a client from the pool
  try {
    // Begin the transaction
    await client.query('BEGIN');

    const currentYear = new Date().getFullYear();
    const { rows } = await client.query(
      `SELECT movie_id, title, release_year
         FROM Movies
        WHERE release_year >= $1
        ORDER BY release_year DESC, movie_id DESC
        LIMIT 10`,
      [currentYear - 1]
    );

    // Commit the transaction
    await client.query('COMMIT');

    res.status(200).json({ movies: rows });
  } catch (error) {
    // Rollback in case of an error
    await client.query('ROLLBACK');
    console.error("Error fetching new movie releases:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    // Release the client back to the pool
    client.release();
  }
});


// ─── Top-Rated Movies ──────────────────────────────────────────────────────────
app.get("/movies/top-rated", isAuthenticated, async (req, res) => {
  const client = await pool.connect(); // Get a client from the pool
  try {
    // Begin the transaction
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT 
         m.movie_id,
         m.title,
         m.release_year,
         ROUND(AVG(r.rating)::numeric, 2)::float AS avg_rating,
         COUNT(r.review_id)               AS review_count
       FROM Movies m
       LEFT JOIN MovieReviews r
         ON m.movie_id = r.movie_id
       GROUP BY m.movie_id
       HAVING COUNT(r.review_id) >= 10
       ORDER BY avg_rating DESC, review_count DESC
       LIMIT 10`
    );

    // Commit the transaction
    await client.query('COMMIT');

    res.status(200).json({ movies: rows });
  } catch (error) {
    // Rollback in case of an error
    await client.query('ROLLBACK');
    console.error("Error fetching top-rated movies:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    // Release the client back to the pool
    client.release();
  }
});



app.post("/books/groups", isAuthenticated, async (req, res) => {
  const { name, description = "", isPublic } = req.body;
  if (!name || typeof isPublic !== "boolean") {
    return res.status(400).json({ message: "Name and visibility required" });
  }

  const client = await pool.connect(); // Get a client from the pool

  try {
    // Begin the transaction
    await client.query("BEGIN");

    // 1) Insert into the Communities table
    const result = await client.query(
      `INSERT INTO Communities (name, description, is_public, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING community_id AS group_id, name, description, is_public`,
      [name, description, isPublic, req.session.userId]
    );
    
    const group = result.rows[0];

    // 2) If the group is private, add the creator as an admin
    if (!isPublic) {
      await client.query(
        `INSERT INTO CommunityMembers (community_id, user_id, role, status)
         VALUES ($1, $2, 'admin', 'joined')`,
        [group.group_id, req.session.userId]
      );
    }

    // Commit the transaction
    await client.query("COMMIT");

    res.status(201).json({ group });

  } catch (err) {
    // Rollback the transaction if there was an error
    await client.query("ROLLBACK");

    if (err.code === "23505") {  // Unique violation error code
      return res.status(409).json({ message: "Group name already exists. Please choose another." });
    }

    console.error("Create group error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    // Release the client back to the pool
    client.release();
  }
});



// Add a new route in app.js or wherever your routes are defined
app.get("/books/groups/popular", isAuthenticated, async (req, res) => {
  const client = await pool.connect(); // Get a client from the pool

  try {
    // Start the transaction
    await client.query("BEGIN");

    const totalLimit = 5;
    const publicLimit = Math.floor(Math.random() * (totalLimit - 1)) + 1; // 1 to 4
    const privateLimit = totalLimit - publicLimit;

    // Query for public communities
    const publicResult = await client.query(
      `
      SELECT 
        c.community_id,
        c.name,
        c.description,
        c.is_public,
        COUNT(cm.user_id) AS member_count
      FROM Communities c
      LEFT JOIN CommunityMembers cm 
        ON c.community_id = cm.community_id AND cm.status = 'joined'
      WHERE c.is_public = TRUE
      GROUP BY c.community_id
      ORDER BY RANDOM()
      LIMIT $1
      `,
      [publicLimit]
    );

    // Query for private communities
    const privateResult = await client.query(
      `
      SELECT 
        c.community_id,
        c.name,
        c.description,
        c.is_public,
        COUNT(cm.user_id) AS member_count
      FROM Communities c
      LEFT JOIN CommunityMembers cm 
        ON c.community_id = cm.community_id AND cm.status = 'joined'
      WHERE c.is_public = FALSE
      GROUP BY c.community_id
      ORDER BY RANDOM()
      LIMIT $1
      `,
      [privateLimit]
    );

    // Combine and shuffle results
    const combined = [...publicResult.rows, ...privateResult.rows];

    // Fisher-Yates Shuffle
    for (let i = combined.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [combined[i], combined[j]] = [combined[j], combined[i]];
    }

    // Commit the transaction
    await client.query("COMMIT");

    res.status(200).json({ popularGroups: combined });

  } catch (err) {
    // Rollback the transaction if an error occurs
    await client.query("ROLLBACK");
    console.error("Fetch groups error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    // Release the client back to the pool
    client.release();
  }
});





// POST /groups/:id/request-access
// POST /books/groups/:id/request-access
app.post("/books/groups/:id/request-access", isAuthenticated, async (req, res) => {
  const userId = req.session.userId;
  const groupId = parseInt(req.params.id, 10);

  if (isNaN(groupId)) {
    return res.status(400).json({ message: "Invalid group ID" });
  }

  const client = await pool.connect(); // Get a client from the pool

  try {
    // Start the transaction
    await client.query("BEGIN");

    // Insert the access request into the CommunityMembers table
    await client.query(
      `INSERT INTO CommunityMembers (community_id, user_id, role, status)
         VALUES ($1, $2, 'member', 'requested')
         ON CONFLICT DO NOTHING`,
      [groupId, userId]
    );

    // Commit the transaction
    await client.query("COMMIT");

    res.status(200).json({ message: "Access request sent" });
  } catch (err) {
    // Rollback the transaction if an error occurs
    await client.query("ROLLBACK");
    console.error("Request access error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    // Release the client back to the pool
    client.release();
  }
});


app.get("/books/groups/:id/access-status", isAuthenticated, async (req, res) => {
  const userId = req.session.userId;
  const groupId = parseInt(req.params.id, 10);

  if (isNaN(groupId)) {
    return res.status(400).json({ message: "Invalid group ID" });
  }

  const client = await pool.connect(); // Get a client from the pool

  try {
    // Start a transaction (though not strictly necessary for this simple read)
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT status FROM CommunityMembers 
       WHERE community_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    // Commit the transaction (for read-only transactions, this is not always required)
    await client.query("COMMIT");

    if (result.rows.length === 0) {
      return res.status(200).json({ status: "none" }); // not requested/joined yet
    }

    return res.status(200).json({ status: result.rows[0].status });
  } catch (err) {
    // Rollback if something goes wrong
    await client.query("ROLLBACK");
    console.error("Access status fetch error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    // Release the client back to the pool
    client.release();
  }
});


app.get("/books/groups/pending-requests", isAuthenticated, async (req, res) => {
  const client = await pool.connect(); // Get a client from the pool

  try {
    // Start a transaction (though not strictly necessary for this simple read)
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT cm2.community_id, c.name AS group_name, u.user_id, u.username
       FROM CommunityMembers cm1 -- Admin's membership
       JOIN CommunityMembers cm2 ON cm1.community_id = cm2.community_id -- Pending members
       JOIN Communities c ON c.community_id = cm2.community_id
       JOIN Users u ON u.user_id = cm2.user_id
       WHERE cm1.user_id = $1
         AND cm1.role = 'admin'
         AND cm2.status = 'requested'
         AND cm2.user_id != $1`,
      [req.session.userId]
    );

    // Commit the transaction (for read-only transactions, this is not always required)
    await client.query("COMMIT");

    console.log(result.rows);  // You may want to remove this in production
    res.json({ requests: result.rows });

  } catch (err) {
    // Rollback if something goes wrong
    await client.query("ROLLBACK");
    console.error("Fetch pending requests error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    // Release the client back to the pool
    client.release();
  }
});

app.post("/api/send_friend_request", async (req, res) => {
  const { toUsername } = req.body;
  const requesterId = req.session.userId;

  if (!toUsername) {
    return res.status(400).json({ message: "Username is required" });
  }

  try {
    // Prevent sending request to oneself
    if (requesterId === toUsername) {
      return res.status(400).json({ message: "Cannot send a friend request to yourself" });
    }

    // Get the user ID of the person being sent the request
    const { rows } = await pool.query("SELECT user_id FROM Users WHERE username = $1", [toUsername]);
    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }
    const addresseeId = rows[0].user_id;

    // Prevent sending a request if already friends or if there is an existing pending request
    const { rowCount } = await pool.query(
      "SELECT * FROM Friends WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)",
      [requesterId, addresseeId]
    );
    if (rowCount > 0) {
      return res.status(400).json({ message: "Friend request already exists or you are already friends" });
    }

    // Insert new friend request with 'requested' status
    await pool.query(
      "INSERT INTO Friends (requester_id, addressee_id, status) VALUES ($1, $2, 'requested')",
      [requesterId, addresseeId]
    );

    res.status(200).json({ message: "Friend request sent successfully" });
  } catch (err) {
    console.error("Error sending friend request:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// API endpoint for checking the friend request status
app.get("/api/friend_request_status", async (req, res) => {
  const { toUsername } = req.query;
  const currentUserId = req.session.userId;

  try {
    const userResult = await pool.query(
      "SELECT user_id FROM Users WHERE username = $1",
      [toUsername]
    );
    if (userResult.rowCount === 0) return res.status(404).json({ status: "not_found" });

    const otherUserId = userResult.rows[0].user_id;

    const result = await pool.query(
      `SELECT * FROM Friends 
       WHERE (requester_id = $1 AND addressee_id = $2) 
          OR (requester_id = $2 AND addressee_id = $1)`,
      [currentUserId, otherUserId]
    );

    if (result.rowCount === 0) return res.json({ status: "none" });

    const row = result.rows[0];

    if (row.status === "accepted") return res.json({ status: "friends" });
    if (row.status === "requested") {
      if (row.requester_id === currentUserId) return res.json({ status: "requested" });
      else return res.json({ status: "pending_you" }); // the other person sent request
    }

    res.json({ status: "unknown" });
  } catch (err) {
    console.error("Status check failed:", err);
    res.status(500).json({ status: "error" });
  }
});

// API endpoint for responding to a friend request (accept/reject)
app.post("/api/respond_friend_request", async (req, res) => {
  const { fromUsername, action } = req.body; // 'action' can be 'accept' or 'reject'
  const requesterId = req.session.userId;

  if (!fromUsername || !action) {
    return res.status(400).json({ message: "Invalid request" });
  }

  try {
    // Find the addressee's user ID
    const { rows } = await pool.query("SELECT user_id FROM Users WHERE username = $1", [fromUsername]);
    if (!rows.length) return res.status(404).json({ message: "User not found" });

    const addresseeId = rows[0].user_id;

    // Prevent self-action
    if (requesterId === addresseeId) {
      return res.status(400).json({ message: "Cannot accept or reject your own request" });
    }

    // Get the existing friend request
    const { rowCount } = await pool.query(
      "SELECT * FROM Friends WHERE requester_id = $1 AND addressee_id = $2 AND status = 'requested'",
      [addresseeId, requesterId]
    );
    if (rowCount === 0) return res.status(404).json({ message: "No pending request" });

    if (action === "accept") {
      // Update status to 'friends'
      await pool.query(
        "UPDATE Friends SET status = 'accepted' WHERE requester_id = $1 AND addressee_id = $2",
        [addresseeId, requesterId]
      );
      return res.json({ message: "Friend request accepted" });
    }

    if (action === "reject") {
      // Remove the friend request entry
      await pool.query(
        "DELETE FROM Friends WHERE requester_id = $1 AND addressee_id = $2",
        [addresseeId, requesterId]
      );
      return res.json({ message: "Friend request rejected" });
    }

    return res.status(400).json({ message: "Invalid action" });
  } catch (err) {
    console.error("Error responding to friend request:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});


// Endpoint to break the friendship
app.post("/api/break_friendship", async (req, res) => {
  const { fromUsername } = req.body; // 'fromUsername' is the username of the friend to break the relationship with
  const currentUserId = req.session.userId;

  if (!fromUsername) {
    return res.status(400).json({ message: "Invalid request" });
  }

  try {
    // Find the addressee's user ID
    const { rows } = await pool.query("SELECT user_id FROM Users WHERE username = $1", [fromUsername]);
    if (!rows.length) return res.status(404).json({ message: "User not found" });

    const addresseeId = rows[0].user_id;

    // Prevent self-action
    if (currentUserId === addresseeId) {
      return res.status(400).json({ message: "Cannot break your own friendship" });
    }

    // Delete the friendship
    const result = await pool.query(
      "DELETE FROM Friends WHERE (requester_id = $1 AND addressee_id = $2 AND status = 'accepted') OR (requester_id = $2 AND addressee_id = $1 AND status = 'accepted')",
      [currentUserId, addresseeId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "No friendship to break" });
    }

    res.json({ message: "Friendship broken successfully" });
  } catch (err) {
    console.error("Error breaking friendship:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});



app.get("/profile", async (req, res) => {
  try {
    // 1) Check authentication
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // 2) Query for joined Users ↔ Profiles
    const query = `
      SELECT
        u.user_id,
        u.username,
        u.email       AS login_email,
        p.email       AS public_email,
        p.dob,
        p.location,
        p.contact
      FROM Users u
      JOIN Profiles p ON p.user_id = u.user_id
      WHERE u.user_id = $1
    `;
    const { rows } = await pool.query(query, [userId]);

    if (rows.length === 0) {
      // Should never happen if you create a Profiles row on signup
      return res.status(404).json({ message: "Profile not found" });
    }

    // 3) Send back profile JSON
    const profile = rows[0];
    res.json({
      userId:       profile.user_id,
      username:     profile.username,
      loginEmail:   profile.login_email,
      publicEmail:  profile.public_email,
      dob:          profile.dob,        // e.g. "1990-05-15"
      location:     profile.location,
      contact:      profile.contact
    });

  } catch (err) {
    console.error("GET /profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
});
app.put('/save_edit', async (req, res) => {
  try {
    console.log("HI");

    // 1) Ensure the user is authenticated
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    console.log("User ID:", userId);

    // 2) Get the profile data from the request body
    const { username, dob, location, contact } = req.body;
    console.log("Received:", { username, dob, location, contact });

    // Validate required fields
    const isValidPhone = contact === null || contact === '' || /^[0-9]{10}$/.test(contact);
if (!isValidPhone) {
  
  return res.status(400).json({ message: 'Contact must be a 10-digit phone number or empty' });
}
    if (!username) {
      return res.status(400).json({ message: 'Username, Date of Birth, and Contact are required' });
    }
    console.log("HI1");
    const usernameCheckQuery = `
    SELECT user_id FROM Users WHERE username = $1 AND user_id != $2
  `;
  const usernameCheckResult = await pool.query(usernameCheckQuery, [username, userId]);

  if (usernameCheckResult.rows.length > 0) {
    return res.status(400).json({ message: 'Username already in use' });
  }
    // 3) Update Users table (username)
    const userUpdateQuery = `
      UPDATE Users
      SET username = $1
      WHERE user_id = $2
      RETURNING username, email;
    `;
    const userValues = [username, userId];
    const userResult = await pool.query(userUpdateQuery, userValues);
    console.log("HI2");

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updatedUser = userResult.rows[0];

    // 4) Update Profiles table (dob, location, contact)
    const cleanDob = dob === '' ? null : dob;

    const profileUpdateQuery = `
      UPDATE Profiles
      SET dob = $1, location = $2, contact = $3
      WHERE user_id = $4
      RETURNING dob, location, contact;
    `;
    
    const profileValues = [cleanDob, location, contact, userId];
    const profileResult = await pool.query(profileUpdateQuery, profileValues);

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    console.log("HI4");

    const updatedProfile = profileResult.rows[0];

    // 5) Send combined updated data as response
    res.json({
      userId: userId,
      username: updatedUser.username,
      email: updatedUser.email,
      dob: updatedProfile.dob,
      location: updatedProfile.location,
      contact: updatedProfile.contact
    });

    console.log("HI5");
  } catch (err) {
    console.log("HI6");

    console.error('PUT /save_edit error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
app.get('/profile_top', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Top Book Genre
    const topBookGenre = await pool.query(
      `SELECT g.genre_name FROM BookFavoriteGenres bfg 
       JOIN Genres g ON bfg.genre_id = g.genre_id 
       WHERE bfg.user_id = $1 
       ORDER BY bfg.favorite_score DESC LIMIT 2`, 
      [userId]
    );

    // Top Author
    const topAuthor = await pool.query(
      `SELECT a.name FROM UserFavoriteAuthors ufa 
      JOIN Authors a ON ufa.author_id = a.author_id 
      WHERE ufa.user_id = $1 
      ORDER BY ufa.favorite_score DESC LIMIT 1`, 
      [userId]
    );
    console.log("Top Author Query");
    console.log(topBookGenre.rows[0]);
    // console.log(topAuthor.rows[0].name); 
    console.log(topAuthor.rows.length);
    res.json({
      // Ensure correct field name for top genre
      topBookGenre: topBookGenre.rows.length > 0 ? topBookGenre.rows[0].genre_name : 'N/A',
      // Ensure correct field name for top author
      topAuthor: topAuthor.rows.length > 0 ? topAuthor.rows[0].name : 'N/A'
    });

  } catch (err) {
    console.error('GET /profile_top error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
app.get('/search_users', async (req, res) => {
  const { username } = req.query;  // Extract username search term from query parameters
  try {
    if (!username) {
      return res.status(400).json({ message: "Username search term is required." });
    }

    // SQL query to search for usernames
    const query = `
      SELECT username
      FROM Users
      WHERE username ILIKE $1
      LIMIT 10;
    `;
    const values = [`%${username}%`];  // Use ILIKE for case-insensitive search

    const { rows } = await pool.query(query, values);

    // If users are found, send them as a response
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error searching for users:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

app.get('/api/friend_request_status', async (req, res) => {
  const currentUserId = req.session.user_id; // or however you're handling auth
  const { toUsername } = req.query;

  try {
    const { rows } = await db.query(
      `SELECT status FROM Friends 
       JOIN Users ON Users.user_id = Friends.addressee_id
       WHERE requester_id = $1 AND username = $2`,
      [currentUserId, toUsername]
    );

    if (rows.length === 0) return res.json({ status: "none" });
    return res.json({ status: rows[0].status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


app.get("/api/friend_requests", async (req, res) => {
  try {
    const currentUserId = req.session.user_id;
    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.log("JI");
    console.log(currentUserId);
    const query = `
      SELECT
        f.requester_id AS user_id,
        u.username,
        f.requested_at
      FROM Friends AS f
      JOIN Users  AS u
        ON f.requester_id = u.user_id
      WHERE f.addressee_id = $1
        AND f.status = 'requested'
    `;

    const { rows } = await pool.query(query, [currentUserId]);
    res.json({ friendRequests: rows });
    console.log(rows);
  } catch (err) {
    console.error("Error fetching friend requests:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/handle_friend_request", async (req, res) => {
  const currentUserId = req.session.user_id;
  const { fromUserId, action } = req.body;

  if (!currentUserId) return res.status(401).json({ error: "Unauthorized" });

  if (!["accepted", "rejected"].includes(action)) {
    return res.status(400).json({ error: "Invalid action" });
  }

  try {
    const client = await pool.connect();
    await client.query("BEGIN");

    if (action === "accepted") {
      // Update request status
      await client.query(
        `UPDATE Friends SET status = 'accepted' WHERE from_user_id = $1 AND to_user_id = $2`,
        [fromUserId, currentUserId]
      );

      // Insert into Friends table (assuming bidirectional)
    } else {
      // Just reject
      await client.query(
        `DELETE FROM FriendRequests
         WHERE from_user_id = $1
           AND to_user_id   = $2`,
        [fromUserId, currentUserId]
      );
    }

    await client.query("COMMIT");
    res.json({ message: `Friend request ${action}` });
  } catch (err) {
    console.error("Error handling friend request:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// server.js (Express)
app.get('/api/profiles/:username', async (req, res) => {
  const { username } = req.params;
  // Fetch from real DB:
  const userResult = await pool.query(
    `SELECT users.user_id, users.username, users.email, profiles.location, profiles.dob, profiles.contact FROM users INNER JOIN profiles ON users.user_id = profiles.user_id WHERE users.username = $1`,
    [username]
  );
  if (userResult.rowCount === 0) {
    return res.status(404).json({ message: 'User not found' });
  }
  const user = userResult.rows[0];

  // Fetch top‐data
  const topResult = await pool.query(
    `SELECT Genres.genre_name AS "topBookGenre", Authors.name AS "topAuthor" FROM BookFavoriteGenres INNER JOIN Genres ON BookFavoriteGenres.genre_id = Genres.genre_id INNER JOIN UserFavoriteAuthors ON BookFavoriteGenres.user_id = UserFavoriteAuthors.user_id INNER JOIN Authors ON UserFavoriteAuthors.author_id = Authors.author_id WHERE BookFavoriteGenres.user_id = $1`,
    [user.user_id]
  );
  const top = topResult.rows[0] || {};

  // Merge and send
  res.json({ ...user, ...top });
});

// Public profile: no auth required
app.get("/api/public_profile/:username", async (req, res) => {
  const { username } = req.params;
  const user = await db.query(
    "SELECT username, email, location, dob, contact FROM Users WHERE username = $1",
    [username]
  );
  if (!user.rowCount) return res.status(404).json({ message: "Not found" });
  const top = await db.query(
    "SELECT genre_name AS \"topBookGenre\", author_name AS \"topAuthor\" FROM UserFavorites WHERE user_id = $1",
    [user.rows[0].user_id]
  );
  // shape into { topBookGenre: "...", topAuthor: "..." }
  res.json({ ...user.rows[0], ...top.rows[0] });
});


app.get("/books/my-groups", isAuthenticated, async (req, res) => {
  const userId = req.session.userId;

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT c.community_id AS group_id, c.name, c.description, c.is_public, cm.role
       FROM CommunityMembers cm
       JOIN Communities c ON cm.community_id = c.community_id
       WHERE cm.user_id = $1 AND cm.status = 'joined'
       ORDER BY c.name ASC`,
      [userId]
    );

    const myGroups = result.rows;
    console.log(myGroups);
    res.status(200).json({ groups: myGroups });

  } catch (err) {
    console.error("Error fetching my groups:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});


// GET /books/groups/:id/posts
// Fetch all posts in a group
app.get("/books/groups/:groupId/posts", isAuthenticated, async (req, res) => {
  const groupId = parseInt(req.params.groupId, 10);
  if (isNaN(groupId)) return res.status(400).json({ message: "Invalid group ID" });

  const client = await pool.connect(); // Get a client from the pool

  try {
    // Start a transaction
    await client.query("BEGIN");

    // Fetch posts with like count
    const postsRes = await client.query(
      `SELECT p.post_id, p.content, p.created_at, u.username AS user_name,
              COUNT(pl.user_id) AS likes
       FROM Posts p
       JOIN Users u ON p.user_id = u.user_id
       LEFT JOIN PostLikes pl ON pl.post_id = p.post_id
       WHERE p.community_id = $1
       GROUP BY p.post_id, u.username
       ORDER BY p.created_at DESC`,
      [groupId]
    );

    const posts = postsRes.rows;

    // Fetch comments for all posts in one query
    const postIds = posts.map((p) => p.post_id);
    let comments = [];
    if (postIds.length > 0) {
      const commentsRes = await client.query(
        `SELECT pc.comment_id, pc.post_id, pc.content, pc.created_at, u.username AS user_name
         FROM PostComments pc
         JOIN Users u ON pc.user_id = u.user_id
         WHERE pc.post_id = ANY($1::int[])
         ORDER BY pc.created_at ASC`,
        [postIds]
      );
      comments = commentsRes.rows;
    }

    // Map comments to their respective posts
    const commentsByPost = {};
    for (const comment of comments) {
      if (!commentsByPost[comment.post_id]) {
        commentsByPost[comment.post_id] = [];
      }
      commentsByPost[comment.post_id].push(comment);
    }

    // Attach comments to posts
    const postsWithComments = posts.map((post) => ({
      ...post,
      comments: commentsByPost[post.post_id] || [],
    }));

    // Commit the transaction
    await client.query("COMMIT");

    res.json({ posts: postsWithComments });

  } catch (err) {
    // Rollback if something goes wrong
    await client.query("ROLLBACK");
    console.error("Error fetching group posts:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    // Release the client back to the pool
    client.release();
  }
});




// Create a new post in a group
app.post("/books/groups/:id/posts", isAuthenticated, async (req, res) => {
  const groupId = parseInt(req.params.id, 10);
  const userId = req.session.userId; // Assuming userId is stored in session
  const { content } = req.body; // The content of the new post

  // Check if the groupId is valid
  if (isNaN(groupId)) {
    return res.status(400).json({ message: "Invalid group ID" });
  }

  // Check if the content is provided
  if (!content || content.trim() === "") {
    return res.status(400).json({ message: "Post content is required" });
  }

  const client = await pool.connect(); // Get a client from the pool

  try {
    // Start a transaction
    await client.query("BEGIN");

    // Fetch the username of the user who is posting
    const userResult = await client.query(
      "SELECT username FROM Users WHERE user_id = $1",
      [userId]
    );
    const username = userResult.rows[0]?.username || "Unknown User";

    // Insert the new post into the Posts table
    const result = await client.query(
      `INSERT INTO Posts (user_id, community_id, content, user_name)
       VALUES ($1, $2, $3, $4)
       RETURNING post_id, content, created_at, user_name`,
      [userId, groupId, content.trim(), username] // Ensure no extra spaces are saved
    );

    const newPost = result.rows[0]; // Get the new post details

    // Commit the transaction
    await client.query("COMMIT");

    // Return the newly created post as part of the response
    res.status(201).json({
      message: "Post created successfully",
      post: newPost,
    });

  } catch (err) {
    // Rollback if something goes wrong
    await client.query("ROLLBACK");
    console.error("Error creating post:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    // Release the client back to the pool
    client.release();
  }
});


// Like a post
app.post("/books/groups/:groupId/posts/:postId/like", isAuthenticated, async (req, res) => {
  const { groupId, postId } = req.params;
  const userId = req.session.userId; // Assuming the user ID is stored in the request's user object (via authentication)

  const client = await pool.connect(); // Get a client from the pool

  try {
    // Start a transaction
    await client.query("BEGIN");

    // Check if the post belongs to the group
    const postResult = await client.query(
      "SELECT * FROM Posts WHERE post_id = $1 AND community_id = $2",
      [postId, groupId]
    );

    if (postResult.rowCount === 0) {
      await client.query("ROLLBACK"); // Rollback if post not found
      return res.status(404).json({ message: "Post not found in this group" });
    }

    // Check if the user has already liked the post
    const likeResult = await client.query(
      "SELECT * FROM PostLikes WHERE user_id = $1 AND post_id = $2",
      [userId, postId]
    );

    if (likeResult.rowCount > 0) {
      await client.query("ROLLBACK"); // Rollback if the user has already liked the post
      return res.status(400).json({ message: "You have already liked this post" });
    }

    // Insert like into PostLikes table
    await client.query(
      "INSERT INTO PostLikes (user_id, post_id) VALUES ($1, $2)",
      [userId, postId]
    );

    // Get the updated like count for the post
    const countResult = await client.query(
      "SELECT COUNT(*) AS likes FROM PostLikes WHERE post_id = $1",
      [postId]
    );
    const likesCount = parseInt(countResult.rows[0].likes, 10);

    // Commit the transaction
    await client.query("COMMIT");

    // Return the updated likes count
    res.status(200).json({ message: "Post liked successfully", likes: likesCount });

  } catch (err) {
    // Rollback if any error occurs
    await client.query("ROLLBACK");
    console.error("Error liking post:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    // Release the client back to the pool
    client.release();
  }
});



// GET /books/groups/:groupId/posts/:postId/comments
app.get("/books/groups/:groupId/posts/:postId/comments", isAuthenticated, async (req, res) => {
  const { groupId, postId } = req.params;

  const client = await pool.connect(); // Get a client from the pool

  try {
    // Start a transaction
    await client.query("BEGIN");

    // 1) Verify that the post exists in this group
    const postResult = await client.query(
      `SELECT 1
         FROM Posts
        WHERE post_id = $1
          AND community_id = $2`,
      [postId, groupId]
    );

    if (postResult.rowCount === 0) {
      await client.query("ROLLBACK"); // Rollback if the post does not exist
      return res.status(404).json({ message: "Post not found in this group" });
    }

    // 2) Fetch all comments for that post, sorted oldest → newest
    const commentsResult = await client.query(
      `SELECT comment_id,
              user_id,
              user_name,
              content,
              created_at
         FROM PostComments
        WHERE post_id = $1
        ORDER BY created_at ASC`,
      [postId]
    );

    // Commit the transaction
    await client.query("COMMIT");

    // 3) Return comments in JSON
    res.json({ comments: commentsResult.rows });
  } catch (err) {
    // Rollback if any error occurs
    await client.query("ROLLBACK");
    console.error("Error fetching comments:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    // Release the client back to the pool
    client.release();
  }
});


// Submit a comment on a post
app.post("/books/groups/:groupId/posts/:postId/comments", isAuthenticated, async (req, res) => {
  const { groupId, postId } = req.params;
  const { content } = req.body;
  const userId = req.session.userId;

  if (!content?.trim()) {
    return res.status(400).json({ message: "Comment content is required" });
  }

  const client = await pool.connect(); // Get a client from the pool

  try {
    // Start a transaction
    await client.query("BEGIN");

    // 1) Verify the post belongs to this group
    const postResult = await client.query(
      `SELECT 1
         FROM Posts
        WHERE post_id = $1
          AND community_id = $2`,
      [postId, groupId]
    );

    if (postResult.rowCount === 0) {
      await client.query("ROLLBACK"); // Rollback if the post does not exist
      return res.status(404).json({ message: "Post not found in this group" });
    }

    // 2) Fetch the commenting user's username
    const userResult = await client.query(
      `SELECT username
         FROM Users
        WHERE user_id = $1`,
      [userId]
    );
    const username = userResult.rows[0]?.username || "Unknown User";

    // 3) Insert the comment, RETURNING user_name
    const commentResult = await client.query(
      `INSERT INTO PostComments (post_id, user_id, content, user_name)
       VALUES ($1, $2, $3, $4)
       RETURNING comment_id, user_id, content, created_at, user_name`,
      [postId, userId, content, username]
    );
    const comment = commentResult.rows[0];

    // 4) Re-count total comments for the post
    const countResult = await client.query(
      `SELECT COUNT(*)::int AS comments
         FROM PostComments
        WHERE post_id = $1`,
      [postId]
    );
    const commentsCount = countResult.rows[0].comments;

    // Commit the transaction
    await client.query("COMMIT");

    // 5) Return the new comment + updated count
    res.status(200).json({
      message: "Comment added successfully",
      comment,
      comments: commentsCount,
    });
  } catch (err) {
    // Rollback if any error occurs
    await client.query("ROLLBACK");
    console.error("Error submitting comment:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    // Release the client back to the pool
    client.release();
  }
});


// PUT /books/groups/:groupId/posts/:postId/comments/:commentId
app.put("/books/groups/:groupId/posts/:postId/comments/:commentId", isAuthenticated, async (req, res) => {
  const { groupId, postId, commentId } = req.params;
  const { content } = req.body;
  const userId = req.session.user_id;

  if (!content?.trim()) {
    return res.status(400).json({ message: "Comment content is required" });
  }

  const client = await pool.connect(); // Get a client from the pool

  try {
    // Start a transaction
    await client.query("BEGIN");

    // Ensure the comment belongs to the user and the specified post
    const check = await client.query(
      `SELECT 1 FROM PostComments WHERE comment_id = $1 AND post_id = $2 AND user_id = $3`,
      [commentId, postId, userId]
    );
    if (check.rowCount === 0) {
      await client.query("ROLLBACK"); // Rollback if the user is not authorized to edit the comment
      return res
        .status(403)
        .json({ message: "You are not authorized to edit this comment" });
    }

    // Update the comment content
    await client.query(
      `UPDATE PostComments SET content = $1 WHERE comment_id = $2`,
      [content.trim(), commentId]
    );

    // Commit the transaction
    await client.query("COMMIT");

    res.json({ message: "Comment updated successfully" });
  } catch (err) {
    // Rollback if any error occurs
    await client.query("ROLLBACK");
    console.error("Error updating comment:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    // Release the client back to the pool
    client.release();
  }
});


// GET /books/groups/:groupId/access-status
app.get("/books/groups/:groupId/access-status", async (req, res) => {
  const groupId = parseInt(req.params.groupId, 10);
  const userId = req.user?.id; // assuming user ID is on req.user from middleware

  if (!userId || isNaN(groupId)) {
    return res.status(400).json({ message: "Invalid group ID or not authenticated" });
  }

  const client = await pool.connect(); // Get a client from the pool

  try {
    // Start a transaction
    await client.query("BEGIN");

    // 1. Check if user is already a member
    const memberResult = await client.query(
      `SELECT role FROM community_members WHERE user_id = $1 AND community_id = $2`,
      [userId, groupId]
    );

    if (memberResult.rows.length > 0) {
      await client.query("COMMIT"); // Commit transaction if member found
      return res.json({ status: "joined" });
    }

    // 2. Check if user has a pending access request
    const requestResult = await client.query(
      `SELECT 1 FROM community_requests WHERE user_id = $1 AND community_id = $2`,
      [userId, groupId]
    );

    if (requestResult.rows.length > 0) {
      await client.query("COMMIT"); // Commit transaction if request found
      return res.json({ status: "requested" });
    }

    // 3. Otherwise, no relationship
    await client.query("COMMIT"); // Commit transaction for no relationship
    return res.json({ status: "none" });

  } catch (err) {
    // Rollback if any error occurs
    await client.query("ROLLBACK");
    console.error("Access status error:", err);
    res.status(500).json({ message: "Failed to determine access status" });
  } finally {
    // Release the client back to the pool
    client.release();
  }
});


app.post("/books/groups/:groupId/handle-request", isAuthenticated, async (req, res) => {
  const { userId, action } = req.body;
  const { groupId } = req.params;
  console.log(action);
  // Validate action value
  // if (!["accepted", "rejected"].includes(action)) {
  //   return res.status(400).json({ message: "Invalid action" });
  // }

  const client = await pool.connect(); // Get a client from the pool

  try {
    // Start a transaction
    await client.query("BEGIN");

    // Confirm current user is an admin of this group
    const adminCheck = await client.query(
      `SELECT 1 FROM CommunityMembers WHERE user_id = $1 AND community_id = $2 AND role = 'admin'`,
      [req.session.userId, groupId]
    );
    if (adminCheck.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "Not authorized" });
    }

    // Update the user's status in the group
    await client.query(
      `UPDATE CommunityMembers SET status = $1 WHERE user_id = $2 AND community_id = $3`,
      [action, userId, groupId]
    );
    console.log(action);

    // Commit the transaction
    await client.query("COMMIT");

    res.json({ message: `User ${action} successfully` });
  } catch (err) {
    // Rollback if any error occurs
    await client.query("ROLLBACK");
    console.error("Handle request error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    // Release the client back to the pool
    client.release();
  }
});


// GET all genres (for selection step)
app.get('/genres', isAuthenticated, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT genre_id, genre_name FROM Genres ORDER BY genre_name'
    );
    res.json(result.rows);  // Return the genres
  } catch (err) {
    console.error('Error fetching genres:', err);
    res.status(500).json({ message: 'Failed to retrieve genres. Please try again later.' });
  }
});


// POST user preferences (session-only, no schema changes)
// Helper to build dynamic INSERT placeholders

// BOOK genres route
// BOOK genres endpoint
app.post('/user/book-genres', isAuthenticated, async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { genres = [] } = req.body;
  if (!Array.isArray(genres) || genres.length === 0) {
    return res.status(400).json({ error: 'No genres selected' });
  }

  const client = await pool.connect();
  try {
    // Begin transaction
    await client.query('BEGIN');

    // Optionally clear old preferences
    await client.query(
      'DELETE FROM BookFavoriteGenres WHERE user_id = $1',
      [userId]
    );

    // Insert one row per genre
    for (const genre_id of genres) {
      console.log(genre_id);
      await client.query(
        `INSERT INTO BookFavoriteGenres
           (user_id, genre_id, total_score, rating_count)
         VALUES ($1, $2, 1.0, 1)
         ON CONFLICT (user_id, genre_id) DO NOTHING`,
        [userId, genre_id]
      );
    }

    // Commit transaction
    await client.query('COMMIT');

    res.status(200).json({ message: 'Book genres saved' });
  } catch (err) {
    console.error('Error saving book genres:', err);
    
    // Rollback in case of error
    await client.query('ROLLBACK');
    
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});



// MOVIE genres endpoint
app.post('/user/movie-genres', isAuthenticated, async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { genres = [] } = req.body;
  if (!Array.isArray(genres) || genres.length === 0) {
    return res.status(400).json({ error: 'No genres selected' });
  }

  const client = await pool.connect();
  try {
    // Begin transaction
    await client.query('BEGIN');

    // Optionally clear old preferences
    await client.query(
      'DELETE FROM MovieFavoriteGenres WHERE user_id = $1',
      [userId]
    );

    // Insert one row per genre
    for (const genre_id of genres) {
      await client.query(
        `INSERT INTO MovieFavoriteGenres
           (user_id, genre_id, total_score, rating_count)
         VALUES ($1, $2, 1.0, 1)
         ON CONFLICT (user_id, genre_id) DO NOTHING`,
        [userId, genre_id]
      );
    }

    // Commit transaction
    await client.query('COMMIT');

    res.status(200).json({ message: 'Movie genres saved' });
  } catch (err) {
    console.error('Error saving movie genres:', err);

    // Rollback in case of error
    await client.query('ROLLBACK');

    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});





// GET all genres (for selection step)


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
}); 