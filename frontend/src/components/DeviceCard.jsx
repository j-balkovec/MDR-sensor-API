export default function DeviceCard({
  dev,
  nickname,
  status,
  isSelected,
  onSelect,
  onDelete,
}) {
  const bg = isSelected ? "#2563eb" : "#e5e7eb";
  const color = isSelected ? "#fff" : "#111827";

  const badgeColor =
    status === "active"
      ? "#16a34a"
      : status === "faulty"
      ? "#dc2626"
      : "#6b7280";

  return (
    <div
      onClick={onSelect}
      style={{
        cursor: "pointer",
        padding: "12px",
        borderRadius: 10,
        background: bg,
        color,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        transition: ".15s",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span>{nickname || dev}</span>
        <span style={{ fontSize: 11, opacity: 0.8 }}>{dev}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            background: badgeColor,
            padding: "2px 6px",
            borderRadius: 6,
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          {status || "unknown"}
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            background: "transparent",
            border: "none",
            fontSize: 16,
            fontWeight: 900,
            cursor: "pointer",
            color,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
