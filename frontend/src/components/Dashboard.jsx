import { useEffect, useState } from "react";

// This is just the subcomponent for the right side of the DashboardLayout
const Dashboard = () => {
  const [recentActivities, setRecentActivities] = useState([]); // ✅ use state

  // Fetch logs for recent activity
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/logs`);
        const data = await res.json();
        if (data.logs) {
          // keep last 5 only, latest first
          setRecentActivities(data.logs.slice(-5).reverse());
        }
      } catch (err) {
        console.error("Failed to fetch logs:", err);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 pl-10 pr-5">
      <div className="max-w-6xl mx-auto">
        {/* Stats Cards Grid */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-8 rounded-xl shadow-sm">
            <div className="text-5xl font-bold text-black mb-3">100+</div>
            <div className="text-gray-700 font-medium">Documents</div>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm">
            <div className="text-5xl font-bold text-black mb-3">0</div>
            <div className="text-gray-700 font-medium">
              Pending Verification
            </div>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm">
            <div className="text-5xl font-bold text-black mb-3">0</div>
            <div className="text-gray-700 font-medium">Escalations</div>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm">
            <div className="text-5xl font-bold text-black mb-3">50+</div>
            <div className="text-gray-700 font-medium">Languages</div>
          </div>
        </div>

        {/* Recent Activity Section */}
        {/* <div className="bg-white rounded-xl shadow-sm p-6"> */}
        <div className="bg-white text-green-400 font-mono p-4 rounded-lg shadow-inner">
  <h3 className="text-lg font-semibold text-black mb-4">
    Recent Activity
  </h3>
  <ul className="space-y-2 max-h-64 overflow-y-auto text-sm">
    {recentActivities.length > 0 ? (
      recentActivities.map((log, idx) => {
        let dotColor = "bg-gray-400";
        if (log.includes("[INFO]")) dotColor = "bg-green-500";
        if (log.includes("[ERROR]")) dotColor = "bg-red-500";
        if (log.includes("[WARN]")) dotColor = "bg-yellow-500";

        return (
          <li
            key={idx}
            className="flex items-center gap-3 border-b border-gray-700 pb-2 last:border-none"
          >
            {/* Colored dot */}
            <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>

            {/* Log text */}
            <span className="text-gray-800">{log}</span>
          </li>
        );
      })
    ) : (
      <li className="text-gray-500">No recent logs</li>
    )}
  </ul>
</div>

      </div>
    </div>
  );
};

export default Dashboard;
