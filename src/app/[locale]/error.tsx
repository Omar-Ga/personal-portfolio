"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000",
        color: "#fff",
        fontFamily: "var(--font-sans)",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h2
        style={{
          fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
          fontWeight: 500,
          marginBottom: "1rem",
          letterSpacing: "-0.02em",
        }}
      >
        Something went wrong.
      </h2>
      <p
        style={{
          fontSize: "1rem",
          opacity: 0.6,
          marginBottom: "2rem",
          maxWidth: "40ch",
          lineHeight: 1.6,
        }}
      >
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={() => reset()}
        style={{
          background: "transparent",
          color: "#fff",
          border: "1px solid rgba(255, 255, 255, 0.5)",
          padding: "1rem 3rem",
          fontFamily: "var(--font-sans)",
          fontSize: "0.9rem",
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          cursor: "pointer",
          transition: "background-color 0.3s ease, color 0.3s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#fff";
          e.currentTarget.style.color = "#000";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = "#fff";
        }}
      >
        Try Again
      </button>
    </div>
  );
}
