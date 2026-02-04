import { useState } from "react";
import { supabase } from "../lib/supabase";

function StatusBadge({ status }) {
  return <span className={`badge ${status}`}>{status}</span>;
}

export default function Dashboard({ queued, sent, failed, stats }) {
  const [resendStatus, setResendStatus] = useState(null);

  const handleResend = async (id) => {
    setResendStatus("Sending...");
    const response = await fetch("/api/resend-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });

    if (!response.ok) {
      setResendStatus("Failed to resend.");
      return;
    }

    setResendStatus("Queued for resend.");
    setTimeout(() => setResendStatus(null), 3000);
  };

  return (
    <main>
      <header>
        <h1>SMS Operations Dashboard</h1>
        <p>Monitor and manage transactional SMS delivery.</p>
      </header>

      {resendStatus && <div className="notice">{resendStatus}</div>}

      <section>
        <h2>Analytics</h2>
        <div className="grid">
          <div className="card">
            <h3>Total SMS (7 days)</h3>
            <strong>{stats.total}</strong>
          </div>
          <div className="card">
            <h3>Success Rate</h3>
            <strong>{stats.successRate}%</strong>
          </div>
          <div className="card">
            <h3>Failure Rate</h3>
            <strong>{stats.failureRate}%</strong>
          </div>
          <div className="card">
            <h3>Top Recipients</h3>
            <ol>
              {stats.topRecipients.map((recipient) => (
                <li key={recipient.phone}>{recipient.phone} ({recipient.count})</li>
              ))}
            </ol>
          </div>
        </div>
        <div>
          <h3>SMS Volume Per Day</h3>
          <div className="chart">
            {stats.volume.map((day) => (
              <div
                key={day.date}
                className="chart-bar"
                style={{ height: `${Math.max(day.count * 12, 6)}px` }}
                title={`${day.date}: ${day.count}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2>Queued Messages</h2>
        <table>
          <thead>
            <tr>
              <th>Phone</th>
              <th>Message</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {queued.map((item) => (
              <tr key={item.id}>
                <td>{item.phone}</td>
                <td>{item.message}</td>
                <td><StatusBadge status={item.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Sent Messages</h2>
        <table>
          <thead>
            <tr>
              <th>Phone</th>
              <th>Message</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sent.map((item) => (
              <tr key={item.id}>
                <td>{item.phone}</td>
                <td>{item.message}</td>
                <td><StatusBadge status={item.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Failed Messages</h2>
        <table>
          <thead>
            <tr>
              <th>Phone</th>
              <th>Message</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {failed.map((item) => (
              <tr key={item.id}>
                <td>{item.phone}</td>
                <td>{item.message}</td>
                <td><StatusBadge status={item.status} /></td>
                <td>
                  <button className="secondary" onClick={() => handleResend(item.id)}>
                    Resend
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

export async function getServerSideProps() {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - 6);

  const { data: messages, error } = await supabase
    .from("sms_queue")
    .select("id, phone, message, status, created_at")
    .gte("created_at", sinceDate.toISOString())
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return {
      props: {
        queued: [],
        sent: [],
        failed: [],
        stats: {
          total: 0,
          successRate: 0,
          failureRate: 0,
          topRecipients: [],
          volume: []
        }
      }
    };
  }

  const queued = messages.filter((item) => item.status === "queued").slice(0, 50);
  const sent = messages.filter((item) => item.status === "sent").slice(0, 50);
  const failed = messages.filter((item) => item.status === "failed").slice(0, 50);

  const totals = messages.length;
  const successCount = sent.length;
  const failureCount = failed.length;

  const byRecipient = messages.reduce((acc, item) => {
    acc[item.phone] = (acc[item.phone] || 0) + 1;
    return acc;
  }, {});

  const topRecipients = Object.entries(byRecipient)
    .map(([phone, count]) => ({ phone, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const volume = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const label = date.toISOString().slice(0, 10);
    const count = messages.filter((item) => item.created_at?.startsWith(label)).length;
    return { date: label, count };
  });

  return {
    props: {
      queued,
      sent,
      failed,
      stats: {
        total: totals,
        successRate: totals ? Math.round((successCount / totals) * 100) : 0,
        failureRate: totals ? Math.round((failureCount / totals) * 100) : 0,
        topRecipients,
        volume
      }
    }
  };
}
