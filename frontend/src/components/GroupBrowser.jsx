/**
 * Reusable drill-down person card grid.
 * Used by Courses, Sessions, Records, Analytics to browse by admin → rep.
 */
const AVATAR_COLORS = ["#4F46E5", "#059669", "#D97706", "#DB2777", "#0891B2", "#7C3AED"];
const getColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

export default function GroupBrowser({ items, label, onSelect, empty }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">{label}</div>
        <span className="muted" style={{ fontSize: 13 }}>
          {items.length} {label.toLowerCase()}{items.length !== 1 ? "s" : ""}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="muted" style={{ padding: "28px 20px", textAlign: "center" }}>
          {empty || "None found."}
        </p>
      ) : (
        <div className="group-browser-list">
          {items.map((p) => (
            <div key={p.id} className="group-browser-card" onClick={() => onSelect(p)}>
              <span className="group-browser-avatar" style={{ background: getColor(p.full_name) }}>
                {p.full_name?.[0]?.toUpperCase()}
              </span>
              <div className="group-browser-info">
                <div className="group-browser-name">{p.full_name}</div>
                <div className="group-browser-meta">@{p.username}</div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <span className="badge valid" style={{ fontSize: 11 }}>
                  {p.count} {p.countLabel || "item"}{p.count !== 1 ? "s" : ""}
                </span>
                {p.flagged > 0 && (
                  <span className="badge flagged" style={{ fontSize: 11 }}>{p.flagged} flagged</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Build a grouping map from a list of items that have owner fields. */
export function buildGroups(items, getAdminKey, getRepKey) {
  const adminMap = {};
  items.forEach((item) => {
    const adminId = getAdminKey(item);
    if (adminId == null) return;
    if (!adminMap[adminId]) {
      adminMap[adminId] = {
        id: adminId,
        full_name: item.owner_admin_name ?? item.owner_full_name,
        username: item.owner_admin_username ?? item.owner_username,
        items: [],
        reps: {},
        count: 0,
        flagged: 0,
      };
    }
    adminMap[adminId].items.push(item);
    adminMap[adminId].count++;
    if (item.attendance_status === "flagged") adminMap[adminId].flagged++;

    const repId = getRepKey(item);
    if (repId != null) {
      if (!adminMap[adminId].reps[repId]) {
        adminMap[adminId].reps[repId] = {
          id: repId,
          full_name: item.owner_full_name,
          username: item.owner_username,
          items: [],
          count: 0,
          flagged: 0,
        };
      }
      adminMap[adminId].reps[repId].items.push(item);
      adminMap[adminId].reps[repId].count++;
      if (item.attendance_status === "flagged") adminMap[adminId].reps[repId].flagged++;
    }
  });
  return Object.values(adminMap).map((g) => ({
    ...g,
    reps: Object.values(g.reps),
  })).sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
}

export function buildRepGroups(items) {
  const map = {};
  items.forEach((item) => {
    const repId = item.owner_id;
    if (repId == null) return;
    if (!map[repId]) {
      map[repId] = {
        id: repId,
        full_name: item.owner_full_name,
        username: item.owner_username,
        items: [],
        count: 0,
        flagged: 0,
      };
    }
    map[repId].items.push(item);
    map[repId].count++;
    if (item.attendance_status === "flagged") map[repId].flagged++;
  });
  return Object.values(map).sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
}
