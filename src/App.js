// frontend/src/App.js
import React from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";

// Navbars
import Navbar from "./components/Navbar";
import BooksNavbar from "./components/BooksNavbar";
import MoviesNavbar from "./components/MoviesNavbar";

// Common Pages
import CommonHome from "./pages/Home";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import NotFound from "./pages/Notfound";
import Modal from "./components/Modal";
import GenreSelection from "./pages/GenreSelection";

// Books
import BooksHome from "./pages/Books/BooksHome";
import Dashboard from "./pages/Books/Dashboard";
import Bookshelf from "./pages/Books/Bookshelf";
import Genres from "./pages/Books/Genres";
import NewReleases from "./pages/Books/NewReleases";
import ChoiceAwards from "./pages/Books/ChoiceAwards";
import BookDetails from "./pages/Books/BookDetails";
import Profile from "./pages/Books/profile";

import FriendsPage from "./pages/Books/FriendsPage";
import ProfilePageNotForFriends from "./pages/Books/ProfilePageNotForFriends";

// Movies
import MoviesHome from "./pages/Movies/MoviesHome";
import MoviesDashboard from "./pages/Movies/MoviesDashboard";
import MovieCollections from "./pages/Movies/MoviesCollections";
import MovieDetails from "./pages/Movies/MoviesDetails";
import MovieGenres from "./pages/Movies/Genres";
import MovieNewReleases from "./pages/Movies/NewReleases";
import MovieTopRated from "./pages/Movies/TopRated";

import Groups from "./pages/Books/Groups";
import GroupPosts from "./pages/Books/GroupPosts";

function App() {
  const location = useLocation();
  // Safely pull out any backgroundLocation (else default to {})
  const state = location.state || {};
  const currentPath = location.pathname;

  // Decide which navbar to show (or none)
  const hideNavbarRoutes = ["/", "/login", "/signup", "/select-genres", "/home"];
  let NavigationComponent = null;
  if (!hideNavbarRoutes.includes(currentPath)) {
    if (currentPath.startsWith("/books")) {
      NavigationComponent = BooksNavbar;
    } else if (currentPath.startsWith("/movies")) {
      NavigationComponent = MoviesNavbar;
    } else {
      NavigationComponent = Navbar;
    }
  }

  return (
    <>
      {NavigationComponent && <NavigationComponent />}

      {/* Main routes: use backgroundLocation if present to keep the list page visible */}
      <Routes location={state.backgroundLocation || location}>
        {/* Common */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/select-genres" element={<GenreSelection />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<CommonHome />} />

        {/* Books */}
        <Route path="/books/home"          element={<BooksHome />} />
        <Route path="/books/dashboard"     element={<Dashboard />} />
        <Route path="/books/bookshelf"     element={<Bookshelf />} />
        <Route path="/books/genres"        element={<Genres />} />
        <Route path="/books/new-releases"  element={<NewReleases />} />
        <Route path="/books/choice-awards" element={<ChoiceAwards />} />
        <Route path="/books/book/:bookId"  element={<BookDetails />} />
        <Route path="/books/profile"  element={<Profile />} />

        <Route path="/profile" element={<Profile />} />

        <Route path="/books/friends" element={<FriendsPage />} />
        <Route path="/books/profile_page_not_for_friends/:username" element={<ProfilePageNotForFriends />} />

        {/* Movies */}
        <Route path="/movies/home"           element={<MoviesHome />} />
        <Route path="/movies/dashboard"      element={<MoviesDashboard />} />
        <Route path="/movies/collections"    element={<MovieCollections />} />
        <Route path="/movies/movie/:movieId" element={<MovieDetails />} />
        <Route path="/movies/genres" element={<MovieGenres />} />
        <Route path="/movies/new-releases" element={<MovieNewReleases />} />
        <Route path="/movies/top-rated" element={<MovieTopRated />} />

        {/* Community */}
        <Route path="/books/groups" element={<Groups />} />
        <Route path="/books/groups/:id" element={<GroupPosts />} />
        <Route path="/books/groups/popular"          element={<Groups />} />
        <Route path="/books/groups/:id/posts" element={<GroupPosts />} />
        <Route path="/books/groups/:groupId/posts/:postId/like" element={<GroupPosts />} />
        <Route path="/books/groups/:groupId/posts/:postId/comments" element={<GroupPosts />} />
        <Route path="/books/groups/:id/access-status" element={<GroupPosts />} />
        <Route path="/books/groups/:id/request-access" element={<GroupPosts />} />

        
        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Modal overlays for detail pages */}
      {state.backgroundLocation && (
        <Routes>
          <Route
            path="/books/book/:bookId"
            element={
              <Modal>
                <BookDetails />
              </Modal>
            }
          />
          <Route
            path="/movies/movie/:movieId"
            element={
              <Modal>
                <MovieDetails />
              </Modal>
            }
          />
        </Routes>
      )}
    </>
  );
}

export default App;
