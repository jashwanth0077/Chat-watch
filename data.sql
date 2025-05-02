-- =============================================
-- INSERT SAMPLE DATA FOR BOOKS
-- =============================================

-- Authors
INSERT INTO Authors (author_id, name) VALUES
(1, 'J.K. Rowling'), (2, 'George Orwell'), (3, 'J.R.R. Tolkien'),
(4, 'Harper Lee'), (5, 'F. Scott Fitzgerald'), (6, 'Jane Austen'),
(7, 'Mark Twain'), (8, 'Ernest Hemingway'), (9, 'Leo Tolstoy'),
(10, 'Agatha Christie'), (11, 'Stephen King'), (12, 'C.S. Lewis'),
(13, 'Isaac Asimov'), (14, 'Arthur C. Clarke'), (15, 'Dan Brown'),
(16, 'Suzanne Collins'), (17, 'Rick Riordan'), (18, 'Margaret Atwood'),
(19, 'Kurt Vonnegut'), (20, 'Neil Gaiman');

-- Genres (shared between Books and Movies)
INSERT INTO Genres (genre_id, genre_name) VALUES
(1, 'Fantasy'), (2, 'Dystopian'), (3, 'Science Fiction'),
(4, 'Adventure'), (5, 'Classic'), (6, 'Mystery'), (7, 'Historical Fiction'),
(8, 'Romance'), (9, 'Horror'), (10, 'Thriller');

-- Books
INSERT INTO Books (book_id, title, publication_year, isbn) VALUES
(1, 'Harry Potter and the Sorcerer''s Stone', 1997, '9780747532699'),
(2, '1984', 1949, '9780451524935'),
(3, 'Animal Farm', 1945, '9780451526342'),
(4, 'The Hobbit', 1937, '9780618968633'),
(5, 'To Kill a Mockingbird', 1960, '9780061120084'),
(6, 'The Great Gatsby', 1925, '9780743273565'),
(7, 'Pride and Prejudice', 1813, '9780141439518'),
(8, 'Adventures of Huckleberry Finn', 1884, '9780142437179'),
(9, 'The Old Man and the Sea', 1952, '9780684801223'),
(10, 'War and Peace', 1869, '9780199232765'),
(11, 'Murder on the Orient Express', 1934, '9780062073501'),
(12, 'The Shining', 1977, '9780307743657'),
(13, 'The Lion, the Witch and the Wardrobe', 1950, '9780064471046'),
(14, 'Foundation', 1951, '9780553293357'),
(15, '2001: A Space Odyssey', 1968, '9780451457998'),
(16, 'The Da Vinci Code', 2003, '9780307474278'),
(17, 'The Hunger Games', 2008, '9780439023481'),
(18, 'Percy Jackson & The Olympians', 2005, '9780786838653'),
(19, 'The Handmaid''s Tale', 1985, '9780385490818'),
(20, 'American Gods', 2001, '9780062472106'),
(21, 'Echoes of Tomorrow', 2025, '9781234567890');

-- BookAuthors
INSERT INTO BookAuthors (book_id, author_id) VALUES
(1, 1), (2, 2), (3, 2), (4, 3), (5, 4), (6, 5),
(7, 6), (8, 7), (9, 8), (10, 9), (11, 10), (12, 11),
(13, 12), (14, 13), (15, 14), (16, 15), (17, 16),
(18, 17), (19, 18), (20, 20), (21, 20);

-- BookGenres
INSERT INTO BookGenres (book_id, genre_id) VALUES
(1, 1), (1, 4), (2, 2), (3, 2), (3, 5), (4, 1), (4, 4),
(5, 5), (5, 7), (6, 5), (7, 8), (8, 4), (9, 7), (10, 7),
(11, 6), (12, 9), (13, 1), (14, 3), (15, 3), (16, 10),
(17, 2), (17, 4), (18, 1), (18, 4), (19, 2), (20, 1), (21, 3);

-- =============================================
-- INSERT SAMPLE DATA FOR MOVIES
-- =============================================

-- Directors
INSERT INTO Directors (director_id, name) VALUES
(1, 'Christopher Nolan'),
(2, 'Steven Spielberg'),
(3, 'Martin Scorsese'),
(4, 'Quentin Tarantino'),
(5, 'James Cameron'),
(6, 'Ridley Scott'),
(7, 'Peter Jackson'),
(8, 'Alfred Hitchcock');

-- Actors
INSERT INTO Actors (actor_id, name) VALUES
(1, 'Leonardo DiCaprio'),
(2, 'Brad Pitt'),
(3, 'Tom Hanks'),
(4, 'Morgan Freeman'),
(5, 'Robert De Niro'),
(6, 'Johnny Depp'),
(7, 'Will Smith'),
(8, 'Matt Damon'),
(9, 'Meryl Streep'),
(10, 'Scarlett Johansson'),
(11, 'Natalie Portman'),
(12, 'Cate Blanchett');

-- Movies (without poster_url and trailer_url)
INSERT INTO Movies (movie_id, title, release_year, imdb_id, duration_minutes, synopsis, director_id, lead_actor_id, lead_actress_id) VALUES
(1, 'Inception', 2010, 'tt1375666', 148, 'A mind-bending thriller about dreams within dreams.', 1, 1, 10),
(2, 'The Wolf of Wall Street', 2013, 'tt0993846', 180, 'The rise and fall of a stockbroker involved in crime.', 3, 1, NULL),
(3, 'Titanic', 1997, 'tt0120338', 195, 'A tragic love story aboard the doomed ship.', 5, 1, 12),
(4, 'Pulp Fiction', 1994, 'tt0110912', 154, 'A series of interconnected stories in a crime world.', 4, 2, 10),
(5, 'Avatar', 2009, 'tt0499549', 162, 'A marine on an alien planet finds a new way of life.', 5, 7, 9),
(6, 'Gladiator', 2000, 'tt0172495', 155, 'A Roman general seeks revenge after being betrayed.', 6, 8, NULL),
(7, 'The Shining', 1980, 'tt0081505', 146, 'A family heads to an isolated hotel; the father descends into madness.', 8, 3, NULL),
(8, 'The Lord of the Rings: The Fellowship of the Ring', 2001, 'tt0120737', 178, 'A hobbit embarks on a quest to destroy a powerful ring.', 7, 8, 9),
(9, 'The Matrix', 1999, 'tt0133093', 136, 'A computer hacker discovers that reality is a simulation.', 1, 7, 10),
(10, 'Interstellar', 2014, 'tt0816692', 169, 'A team travels through a wormhole in search of a new home for humanity.', 1, 2, 11);

-- MovieGenres
INSERT INTO MovieGenres (movie_id, genre_id) VALUES
(1, 3), (1, 10),   -- Inception: Science Fiction, Thriller
(2, 10),           -- The Wolf of Wall Street: Thriller
(3, 8), (3, 7),    -- Titanic: Romance, Historical Fiction
(4, 10), (4, 5),   -- Pulp Fiction: Thriller, Classic
(5, 3), (5, 4),    -- Avatar: Science Fiction, Adventure
(6, 7), (6, 4),    -- Gladiator: Historical Fiction, Adventure
(7, 9), (7, 10),   -- The Shining: Horror, Thriller
(8, 1), (8, 4),    -- The Lord of the Rings: Fantasy, Adventure
(9, 3), (9, 10),   -- The Matrix: Science Fiction, Thriller
(10, 3), (10, 4);  -- Interstellar: Science Fiction, Adventure

-- MovieReviews
INSERT INTO MovieReviews (review_id, movie_id, user_id, rating, message, contains_spoilers) VALUES
(1, 1, 1, 5, 'Mind-blowing concept and visuals!', FALSE),
(2, 3, 2, 4, 'A tragic romance that touched my heart.', TRUE);

-- MovieCollections (formerly Movie Shelves)
INSERT INTO MovieCollections (collection_id, user_id, name, is_private) VALUES
(1, 1, 'Sci-Fi Favorites', FALSE),
(2, 2, 'Blockbuster Hits', TRUE);

-- CollectionMovies
INSERT INTO CollectionMovies (collection_id, movie_id) VALUES
(1, 1), (1, 5), (1, 9),
(2, 3), (2, 4), (2, 10);

-- MovieAwards
INSERT INTO MovieAwards (award_id, movie_id, award_name, award_year, result) VALUES
(1, 3, 'Best Picture', 1998, 'Won'),
(2, 1, 'Best Visual Effects', 2011, 'Won'),
(3, 10, 'Best Sound Editing', 2015, 'Nominated');
