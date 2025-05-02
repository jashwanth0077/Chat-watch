import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { apiUrl } from "../config/config";
import "../css/Login.css";

const Login = () => {
  const navigate = useNavigate(); // Use this to redirect users
  const [isLoading, setIsLoading] = useState(true);

  // useEffect checks if the user is already logged in
  // if already loggedIn then it will simply navigate to the dashboard
  // TODO: Implement the checkStatus function.
  useEffect(() => {
    const checkStatus = async () => {
      // Implement your logic here
      try {
        const response = await fetch(`${apiUrl}/isLoggedIn`, {
          method: "GET",
          credentials: "include",
        });
        const data = await response.json();
if (response.ok && data.loggedIn) {
  navigate("/home");
} else {
  setIsLoading(false);
}

      } catch (error) {
        console.error("Error checking login status:", error);
        setIsLoading(false);
      }
      
    };
    checkStatus();
  }, [navigate]);

  // Read about useState to manage form data
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // TODO: This function handles input field changes
  const handleChange = (e) => {
    // Implement your logic here
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  

  // TODO: Implement the login operation
  // This function should send form data to the server
  // and handle login success/failure responses.
  // Use the API you made for handling this.
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Implement the login logic here
    try {
      const response = await fetch(`${apiUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        navigate("/home");
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Login error:", error);
    }

  };

  // TODO: Use JSX to create a login form with input fields for:
  // - Email
  // - Password
  // - A submit button
  return (
    <div className="login-container">
      {/* <div className="login-left" />
      <div className="login-right" /> */}
      <div className="login-box">
        <h1>VibeSync</h1>
        <h2>Where Books Inspire and Movies Resonate</h2>
        <form onSubmit={handleSubmit} method="POST">
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <button type="submit">Login</button>
        </form>
        <p>
          Don't have an account? <a href="/signup">Sign up here</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
