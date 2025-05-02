-- =============================================
-- USERS TABLE (Used by both Books & Movies)
-- =============================================
CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
);

-- =============================================
-- BOOKS SCHEMA
-- =============================================

-- Table for storing book information
CREATE TABLE Books (
    book_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    publication_year INT,
    isbn VARCHAR(13) UNIQUE
);

-- Table for storing author information
CREATE TABLE Authors (
    author_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

-- Junction table for the many-to-many relationship between Books and Authors
CREATE TABLE BookAuthors (
    book_id INT,
    author_id INT,
    PRIMARY KEY (book_id, author_id),
    FOREIGN KEY (book_id) REFERENCES Books(book_id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES Authors(author_id) ON DELETE CASCADE
);

-- Table for storing genre information (shared with Movies)
CREATE TABLE Genres (
    genre_id SERIAL PRIMARY KEY,
    genre_name VARCHAR(100) UNIQUE NOT NULL
);

-- Junction table for the many-to-many relationship between Books and Genres
CREATE TABLE BookGenres (
    book_id INT,
    genre_id INT,
    PRIMARY KEY (book_id, genre_id),
    FOREIGN KEY (book_id) REFERENCES Books(book_id) ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES Genres(genre_id) ON DELETE CASCADE
);

-- Table for storing user-created bookshelves
CREATE TABLE Bookshelves (
    bookshelf_id SERIAL PRIMARY KEY,
    user_id INT,
    name VARCHAR(255) NOT NULL,
    is_exclusive BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Junction table for the many-to-many relationship between Bookshelves and Books
CREATE TABLE BookshelfBooks (
    bookshelf_id INT,
    book_id INT,
    PRIMARY KEY (bookshelf_id, book_id),
    FOREIGN KEY (bookshelf_id) REFERENCES Bookshelves(bookshelf_id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES Books(book_id) ON DELETE CASCADE
);

-- Table for storing book reviews
CREATE TABLE Reviews (
    review_id SERIAL PRIMARY KEY,
    book_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    message TEXT,
    review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES Books(book_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- =============================================
-- MOVIES SCHEMA
-- =============================================

-- Table for storing director information
CREATE TABLE Directors (
    director_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

-- Table for storing actor information (used for both lead roles)
CREATE TABLE Actors (
    actor_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

-- Enhanced table for storing movie information
-- Note: poster_url and trailer_url have been removed
CREATE TABLE Movies (
    movie_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    release_year INT,
    imdb_id VARCHAR(20) UNIQUE,      -- External identifier, optional
    duration_minutes INT,            -- Duration in minutes
    synopsis TEXT,                   -- Brief summary of the movie plot
    director_id INT NOT NULL,
    lead_actor_id INT,
    lead_actress_id INT,
    FOREIGN KEY (director_id) REFERENCES Directors(director_id) ON DELETE CASCADE,
    FOREIGN KEY (lead_actor_id) REFERENCES Actors(actor_id) ON DELETE SET NULL,
    FOREIGN KEY (lead_actress_id) REFERENCES Actors(actor_id) ON DELETE SET NULL
);

-- Junction table for the many-to-many relationship between Movies and Genres
CREATE TABLE MovieGenres (
    movie_id INT,
    genre_id INT,
    PRIMARY KEY (movie_id, genre_id),
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES Genres(genre_id) ON DELETE CASCADE
);

-- Table for storing movie reviews
CREATE TABLE MovieReviews (
    review_id SERIAL PRIMARY KEY,
    movie_id INT NOT NULL,
    user_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    message TEXT,
    review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    contains_spoilers BOOLEAN DEFAULT FALSE,  -- Flag indicating spoiler content
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Renamed table for user-created collections of movies
CREATE TABLE MovieCollections (
    collection_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_private BOOLEAN DEFAULT FALSE,             -- Option flag to mark a collection as private
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Junction table for the many-to-many relationship between MovieCollections and Movies
CREATE TABLE CollectionMovies (
    collection_id INT,
    movie_id INT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- When the movie was added to the collection
    PRIMARY KEY (collection_id, movie_id),
    FOREIGN KEY (collection_id) REFERENCES MovieCollections(collection_id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE
);

-- Optional: Table for storing awards information related to movies
CREATE TABLE MovieAwards (
    award_id SERIAL PRIMARY KEY,
    movie_id INT NOT NULL,
    award_name VARCHAR(255) NOT NULL,  -- e.g., "Best Picture", "Golden Globe"
    award_year INT,
    result VARCHAR(50),                -- e.g., "Won", "Nominated"
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE
);

ALTER TABLE Users
ADD COLUMN is_subscribed BOOLEAN DEFAULT FALSE;

CREATE TABLE Posts (
    post_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    community_id INT,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_name VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (community_id) REFERENCES Communities(community_id) ON DELETE SET NULL
);

CREATE TABLE PostLikes (
    user_id INT,
    post_id INT,
    PRIMARY KEY (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES Posts(post_id) ON DELETE CASCADE
);

CREATE TABLE PostComments (
    comment_id SERIAL PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_name VARCHAR(255),
    FOREIGN KEY (post_id) REFERENCES Posts(post_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);


CREATE TABLE Communities (
    community_id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    is_type VARCHAR(20) DEFAULT 'book' CHECK (role IN ('movie', 'book')),
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES Users(user_id) ON DELETE CASCADE
);


CREATE TABLE CommunityMembers (
    community_id INT,
    user_id INT,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    status VARCHAR(20) CHECK (status IN ('joined', 'requested')),
    PRIMARY KEY (community_id, user_id),
    FOREIGN KEY (community_id) REFERENCES Communities(community_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);


CREATE TABLE Friends (
    requester_id INT,
    addressee_id INT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('requested', 'accepted')),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (requester_id, addressee_id),
    FOREIGN KEY (requester_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (addressee_id) REFERENCES Users(user_id) ON DELETE CASCADE
);


CREATE TABLE BookFavoriteGenres (
  user_id INT,
  genre_id INT,
  total_score FLOAT DEFAULT 0,
  rating_count INT DEFAULT 0,
  favorite_score FLOAT GENERATED ALWAYS AS (total_score / NULLIF(rating_count, 0)) STORED,
  PRIMARY KEY (user_id, genre_id),
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (genre_id) REFERENCES Genres(genre_id) ON DELETE CASCADE
);

CREATE TABLE MovieFavoriteGenres (
  user_id INT,
  genre_id INT,
  total_score FLOAT DEFAULT 0,
  rating_count INT DEFAULT 0,
  favorite_score FLOAT GENERATED ALWAYS AS (total_score / NULLIF(rating_count, 0)) STORED,
  PRIMARY KEY (user_id, genre_id),
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (genre_id) REFERENCES Genres(genre_id) ON DELETE CASCADE
);


CREATE TABLE UserFavoriteAuthors (
    user_id INT NOT NULL,
    author_id INT NOT NULL,
    total_score INT DEFAULT 0, -- Sum of all ratings for this author
    rating_count INT DEFAULT 0, -- Number of ratings for this author
    favorite_score FLOAT DEFAULT 1.0, -- Normalized score based on user ratings
    PRIMARY KEY (user_id, author_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES Authors(author_id) ON DELETE CASCADE
);

CREATE TABLE UserFavoriteDirectors (
    user_id INT NOT NULL,
    director_id INT NOT NULL,
    total_score INT DEFAULT 0, -- Sum of all ratings for this director
    rating_count INT DEFAULT 0, -- Number of ratings for this director
    favorite_score FLOAT DEFAULT 1.0, -- Normalized score based on user ratings
    PRIMARY KEY (user_id, director_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (director_id) REFERENCES Directors(director_id) ON DELETE CASCADE
);

CREATE TABLE UserFavoriteActors (
    user_id INT NOT NULL,
    actor_id INT NOT NULL,
    total_score INT DEFAULT 0, -- Sum of all ratings for this actor
    rating_count INT DEFAULT 0, -- Number of ratings for this actor
    favorite_score FLOAT DEFAULT 1.0, -- Normalized score based on user ratings
    PRIMARY KEY (user_id, actor_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES Actors(actor_id) ON DELETE CASCADE
);

CREATE TABLE UserFavoriteActresses (
    user_id INT NOT NULL,
    actress_id INT NOT NULL,
    total_score INT DEFAULT 0, -- Sum of all ratings for this actress
    rating_count INT DEFAULT 0, -- Number of ratings for this actress
    favorite_score FLOAT DEFAULT 1.0, -- Normalized score based on user ratings
    PRIMARY KEY (user_id, actress_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (actress_id) REFERENCES Actors(actor_id) ON DELETE CASCADE
);

