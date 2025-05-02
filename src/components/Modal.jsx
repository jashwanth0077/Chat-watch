// src/components/Modal.jsx
import React from "react";

const Modal = ({ children }) => {
  return (
    <div style={{
      background: "rgba(0,0,0,0.5)",
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000
    }}>
      <div style={{
        background: "white",
        padding: "20px",
        borderRadius: "8px",
        maxWidth: "600px",
        width: "90%"
      }}>
        {children}
      </div>
    </div>
  );
};

export default Modal;
