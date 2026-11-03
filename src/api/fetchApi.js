const BASE_URL = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");

const fetchApi = async (url, options = {}) => {
  if (!BASE_URL && !url.startsWith("http")) {
    throw new Error(
      "Backend URL is missing. Please configure VITE_BACKEND_URL in your Vercel Project Settings > Environment Variables, then redeploy."
    );
  }

  const token = localStorage.getItem("webapptoken");
  const fullUrl = url.startsWith("http")
    ? url
    : `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;

  let response;
  try {
    response = await fetch(fullUrl, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });
  } catch (err) {
    throw new Error(
      `Failed to reach backend server. Please verify your backend is running at ${BASE_URL}`
    );
  }

  const contentType = response.headers.get("content-type") || "";
  let data = null;

  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      throw new Error("Invalid JSON response received from server.");
    }
  } else {
    const text = await response.text().catch(() => "");
    throw new Error(
      !response.ok
        ? `Server error (${response.status}): ${text.slice(0, 100)}`
        : "Received HTML instead of JSON. Ensure VITE_BACKEND_URL points to the backend API, not the frontend."
    );
  }

  if (!response.ok) {
    throw new Error(data?.message || `Request failed with status ${response.status}`);
  }

  return data;
};

export default fetchApi;
