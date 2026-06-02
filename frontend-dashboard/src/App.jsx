import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Thermometer,
  Droplets,
  Sun,
  UserCheck,
  UserX,
  Activity,
  Wifi,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";

// ─── Konstanta ──────────────────────────────────────────────────────────────
const MAX_HISTORY = 30; // Jumlah titik data maksimum di grafik

// ─── Koneksi Socket.IO ke Back-End ──────────────────────────────────────────
const socket = io("http://localhost:4000");

// ─── Helper: Evaluasi comfort zone ──────────────────────────────────────────
function getComfortStatus(suhu, kelembapan) {
  const suhuOk = suhu >= 22 && suhu <= 26;
  const kelembapanOk = kelembapan >= 40 && kelembapan <= 60;

  if (suhuOk && kelembapanOk) return "ideal";
  if (!suhuOk && !kelembapanOk) return "danger";
  return "warning";
}

// ─── Sub-komponen: Metric Card ───────────────────────────────────────────────
function MetricCard({ label, value, unit, icon: Icon, iconColor, accent, sub }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${accent} bg-gray-900 p-5 transition-all duration-300 hover:scale-[1.02]`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-1">
            {label}
          </p>
          <p className="text-4xl font-mono font-bold text-gray-100 leading-none">
            {value}
            <span className="text-xl text-gray-400 ml-1">{unit}</span>
          </p>
          {sub && (
            <p className="text-xs text-gray-500 mt-2 font-mono">{sub}</p>
          )}
        </div>
        <div className={`p-2 rounded-lg bg-gray-800 ${iconColor}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

// ─── Sub-komponen: Chart Panel ───────────────────────────────────────────────
function ChartPanel({ title, data, dataKey, color, unit, domain, refLines }) {
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono shadow-xl">
        <p className="text-gray-400 mb-1">{label}</p>
        <p style={{ color }} className="font-bold">
          {payload[0].value} {unit}
        </p>
      </div>
    );
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        <h3 className="text-xs font-mono uppercase tracking-widest text-gray-400">
          {title}
        </h3>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 9, fontFamily: "monospace", fill: "#4b5563" }}
            interval="preserveStartEnd"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={domain}
            tick={{ fontSize: 9, fontFamily: "monospace", fill: "#4b5563" }}
            tickLine={false}
            axisLine={false}
          />
          {refLines?.map((rl) => (
            <ReferenceLine
              key={rl.value}
              y={rl.value}
              stroke={rl.color}
              strokeDasharray="4 4"
              strokeWidth={1}
            />
          ))}
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: "#111827", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Komponen Utama: App ─────────────────────────────────────────────────────
export default function App() {
  const [history, setHistory] = useState([]);
  const [connected, setConnected] = useState(false);
  const [tick, setTick] = useState(0);

  // Ambil data terbaru (nilai "saat ini") untuk mengisi kotak metrik di atas
  const latest = history.length > 0 ? history[history.length - 1] : { suhu: 0, kelembapan: 0, cahaya: 0, orang: 0 };
  
  const comfortStatus = getComfortStatus(latest.suhu, latest.kelembapan);

  // useEffect: Mendengarkan data dari server back-end
  useEffect(() => {
    // Jika berhasil terhubung ke server
    socket.on("connect", () => {
      setConnected(true);
    });

    // Jika server mati atau terputus
    socket.on("disconnect", () => {
      setConnected(false);
    });

    // Menerima kiriman data dari server (bernama 'sensor_update')
    socket.on("sensor_update", (dataBaru) => {
      setHistory((prev) => {
        // Potong history agar tidak melebihi MAX_HISTORY titik grafik
        const trimmed = prev.length >= MAX_HISTORY ? prev.slice(1) : prev;
        return [...trimmed, dataBaru];
      });
      setTick((t) => t + 1);
    });

    // Cleanup: matikan listener saat komponen ditutup
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("sensor_update");
    };
  }, []);

  // ─── Comfort Zone Config ──────────────────────────────────────────────────
  const comfortConfig = {
    ideal: {
      icon: CheckCircle2,
      text: "Kondisi: Ideal",
      bg: "bg-emerald-950",
      border: "border-emerald-800",
      color: "text-emerald-400",
      iconColor: "text-emerald-400",
    },
    warning: {
      icon: AlertTriangle,
      text: "Kondisi: Perlu Perhatian",
      bg: "bg-amber-950",
      border: "border-amber-800",
      color: "text-amber-400",
      iconColor: "text-amber-400",
    },
    danger: {
      icon: AlertTriangle,
      text: "Kondisi: Tidak Nyaman",
      bg: "bg-red-950",
      border: "border-red-900",
      color: "text-red-400",
      iconColor: "text-red-400",
    },
  };

  const comfort = comfortConfig[comfortStatus];
  const ComfortIcon = comfort.icon;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity size={20} className="text-cyan-400" />
            <h1 className="text-sm font-mono font-bold tracking-widest uppercase text-gray-100">
              Smart Room & Desk Monitor
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs font-mono text-gray-500">
              <Clock size={12} />
              Update #{tick}
            </span>
            <div
              className={`flex items-center gap-2 text-xs font-mono ${
                connected ? "text-emerald-400" : "text-red-400"
              }`}
            >
              <Wifi size={14} />
              {connected ? "LIVE" : "OFFLINE"}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* ── Metric Cards ────────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-mono uppercase tracking-widest text-gray-600 mb-4">
            Bacaan Sensor Saat Ini
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Suhu Ruangan"
              value={latest?.suhu ?? "—"}
              unit="°C"
              icon={Thermometer}
              iconColor="text-orange-400"
              accent="border-orange-900/60"
              sub={`Range: 22–30°C`}
            />
            <MetricCard
              label="Kelembapan"
              value={latest?.kelembapan ?? "—"}
              unit="%RH"
              icon={Droplets}
              iconColor="text-blue-400"
              accent="border-blue-900/60"
              sub={`Range: 40–70%`}
            />
            <MetricCard
              label="Intensitas Cahaya"
              value={latest?.cahaya ?? "—"}
              unit="Lux"
              icon={Sun}
              iconColor="text-yellow-400"
              accent="border-yellow-900/60"
              sub={`Range: 0–500 Lux`}
            />
            <MetricCard
              label="Status Meja (PIR)"
              value={latest?.orang === 1 ? "ADA" : "KOSONG"}
              unit=""
              icon={latest?.orang === 1 ? UserCheck : UserX}
              iconColor={
                latest?.orang === 1 ? "text-emerald-400" : "text-gray-500"
              }
              accent={
                latest?.orang === 1
                  ? "border-emerald-900/60"
                  : "border-gray-800"
              }
              sub={`Sinyal PIR: ${latest?.orang ?? "—"}`}
            />
          </div>
        </section>

        {/* ── Comfort Zone Indicator ───────────────────────────────────── */}
        <section>
          <div
            className={`flex items-center gap-3 rounded-xl border px-5 py-3.5 ${comfort.bg} ${comfort.border}`}
          >
            <ComfortIcon size={18} className={comfort.iconColor} />
            <div className="flex-1">
              <p className={`text-sm font-mono font-bold ${comfort.color}`}>
                {comfort.text}
              </p>
              <p className="text-xs text-gray-500 font-mono mt-0.5">
                Suhu ideal: 22–26°C &nbsp;·&nbsp; Kelembapan ideal: 40–60%RH
                &nbsp;·&nbsp; Saat ini:{" "}
                <span className={comfort.color}>
                  {latest?.suhu}°C / {latest?.kelembapan}%RH
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* ── Time-Series Charts ───────────────────────────────────────── */}
        <section>
          <p className="text-xs font-mono uppercase tracking-widest text-gray-600 mb-4">
            Riwayat Sensor (30 Titik Terakhir)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <ChartPanel
              title="Suhu Ruangan (°C)"
              data={history}
              dataKey="suhu"
              color="#fb923c"
              unit="°C"
              domain={[20, 32]}
              refLines={[
                { value: 22, color: "#34d399" },
                { value: 26, color: "#34d399" },
              ]}
            />
            <ChartPanel
              title="Kelembapan (%RH)"
              data={history}
              dataKey="kelembapan"
              color="#60a5fa"
              unit="%RH"
              domain={[35, 75]}
              refLines={[
                { value: 40, color: "#34d399" },
                { value: 60, color: "#34d399" },
              ]}
            />
            <ChartPanel
              title="Intensitas Cahaya (Lux)"
              data={history}
              dataKey="cahaya"
              color="#facc15"
              unit="Lux"
              domain={[0, 520]}
            />
          </div>
        </section>

        {/* ── Status Tabel ───────────────────────────── */}
        <section>
          <p className="text-xs font-mono uppercase tracking-widest text-gray-600 mb-4">
            Log Data Terbaru
          </p>
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500">
                    <th className="text-left px-4 py-3">Waktu</th>
                    <th className="text-right px-4 py-3">Suhu (°C)</th>
                    <th className="text-right px-4 py-3">Kelembapan (%)</th>
                    <th className="text-right px-4 py-3">Cahaya (Lux)</th>
                    <th className="text-right px-4 py-3">Status Meja</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().slice(0, 8).map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-gray-800/50 ${
                        i === 0 ? "bg-gray-800/40" : ""
                      } hover:bg-gray-800/30 transition-colors`}
                    >
                      <td className="px-4 py-2.5 text-gray-400">{row.time}</td>
                      <td className="px-4 py-2.5 text-right text-orange-400">
                        {row.suhu}
                      </td>
                      <td className="px-4 py-2.5 text-right text-blue-400">
                        {row.kelembapan}
                      </td>
                      <td className="px-4 py-2.5 text-right text-yellow-400">
                        {row.cahaya}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs ${
                            row.orang === 1
                              ? "bg-emerald-900/60 text-emerald-400"
                              : "bg-gray-800 text-gray-500"
                          }`}
                        >
                          {row.orang === 1 ? "Ada Orang" : "Kosong"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="max-w-7xl mx-auto px-6 py-6 mt-4 border-t border-gray-800">
        <p className="text-xs font-mono text-gray-600 text-center">
          Smart Room & Desk Monitoring · Data disiarkan dari server Node.js
        </p>
      </footer>
    </div>
  );
}