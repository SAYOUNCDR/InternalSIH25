// src/components/VerificationInterface.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // ✅ add navigation
import { BarChart2, CheckCircle, FileText } from "lucide-react";
import sendIcon from "../../icons/send.svg";
import micIcon from "../../icons/microphone.svg";

const API_BASE = "http://127.0.0.1:8000";

const VerificationInterface = () => {
  const [inputValue, setInputValue] = useState("");
  const [documents, setDocuments] = useState([]);
  const [chatMessages, setChatMessages] = useState([]); // ✅ chat history
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch documents from backend
  const fetchDocs = async () => {
    try {
      const res = await fetch(`${API_BASE}/documents`);
      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      console.error("Error fetching docs:", err);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  // Approve a document
  const releaseDoc = async (filename) => {
    try {
      const res = await fetch(`${API_BASE}/approve_doc/${filename}`, {
        method: "POST",
      });
      if (res.ok) {
        alert(`${filename} released!`);
        fetchDocs(); // refresh status
      } else {
        const err = await res.json();
        alert("Error: " + err.detail);
      }
    } catch (err) {
      console.error("Release failed:", err);
    }
  };

  // Handle chat send
  const handleSend = async () => {
    if (!inputValue.trim()) return;

    // Add user message to chat
    const newMessage = { sender: "user", text: inputValue };
    setChatMessages((prev) => [...prev, newMessage]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: inputValue }),
      });

      const data = await res.json();

      // Add bot response
      const botMessage = { sender: "bot", text: data.response || "No reply" };
      setChatMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      setChatMessages((prev) => [
        ...prev,
        { sender: "bot", text: "⚠️ Error contacting server" },
      ]);
    } finally {
      setInputValue("");
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex bg-gray-100">
      {/* Sidebar */}
      <div className="w-56 bg-black text-white flex flex-col py-6">
        <div className="flex flex-col gap-2 px-4">
          <button
            className="flex items-center gap-3 p-2 rounded hover:bg-gray-800"
            onClick={() => navigate("/analytics")}
          >
            <BarChart2 size={18} />
            <span>Analytics</span>
          </button>

          <button className="flex items-center gap-3 p-2 rounded bg-gray-900">
            <CheckCircle size={18} />
            <span>Test Chatbot</span>
          </button>

          <button
            className="flex items-center gap-3 p-2 rounded hover:bg-gray-800"
            onClick={() => navigate("/policies")}
          >
            <FileText size={18} />
            <span>Policies</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-gray-200">
          <h1 className="text-3xl font-bold">Verification</h1>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <h2 className="text-2xl font-semibold mb-10">
            Test and Verify the Data
          </h2>

          {/* Document Cards */}
          <div className="flex gap-6 mb-16 flex-wrap">
            {documents.map((doc, idx) => (
              <div
                key={idx}
                className="bg-white border rounded-xl p-6 w-56 text-center shadow-sm hover:shadow-md transition-shadow"
              >
                <FileText className="w-10 h-10 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-800 font-medium">{doc.name}</p>
                <p
                  className={`mt-2 text-sm ${
                    doc.status === "verified"
                      ? "text-green-600"
                      : "text-yellow-600"
                  }`}
                >
                  {doc.status}
                </p>
                {doc.status !== "verified" && (
                  <button
                    onClick={() => releaseDoc(doc.name)}
                    className="mt-4 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                  >
                    Release
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat Window */}
        <div className="flex-1 overflow-y-auto bg-white border-t border-gray-200 p-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`px-4 py-2 rounded-lg shadow ${
                    msg.sender === "user"
                      ? "bg-black text-white"
                      : "bg-gray-200 text-gray-900"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-gray-500 text-sm">Bot is typing...</div>
            )}
          </div>
        </div>

        {/* Chat Input */}
        <div className="border-t border-gray-200 bg-gray-100 p-4">
          <div className="max-w-3xl mx-auto flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask me anything..."
              className="flex-1 px-6 py-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()} // send on Enter
            />
            <button className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-gray-200">
              <img src={micIcon} alt="Mic" className="w-6 h-6" />
            </button>
            <button
              onClick={handleSend}
              className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-gray-200"
            >
              <img src={sendIcon} alt="Send" className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationInterface;
