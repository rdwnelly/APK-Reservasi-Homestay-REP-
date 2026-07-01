"use client";

import React, { useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

interface OTAChannel {
  id: string;
  name: string;
  logo: string;
  status: "Connected" | "Disconnected";
  lastSynced: string;
}

interface SyncLog {
  id: string;
  time: string;
  channel: string;
  message: string;
  type: "success" | "warning" | "error" | "info";
}

const initialChannels: OTAChannel[] = [
  { id: "traveloka", name: "Traveloka", logo: "🔵", status: "Connected", lastSynced: new Date().toLocaleString() },
  { id: "agoda", name: "Agoda", logo: "🔴", status: "Disconnected", lastSynced: "-" },
  { id: "booking", name: "Booking.com", logo: "🟦", status: "Connected", lastSynced: new Date(Date.now() - 3600000).toLocaleString() },
  { id: "airbnb", name: "Airbnb", logo: "🏩", status: "Disconnected", lastSynced: "-" },
];

const initialLogs: SyncLog[] = [
  { id: "1", time: new Date().toLocaleTimeString(), channel: "Traveloka", message: "Successfully synced 12 rooms availability.", type: "success" },
  { id: "2", time: new Date(Date.now() - 3600000).toLocaleTimeString(), channel: "Booking.com", message: "Received new reservation for Double Room AC.", type: "info" },
];

export default function ChannelManagerPage() {
  const [channels, setChannels] = useState<OTAChannel[]>(initialChannels);
  const [logs, setLogs] = useState<SyncLog[]>(initialLogs);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  const handleConnectToggle = (id: string) => {
    setChannels(channels.map(ch => {
      if (ch.id === id) {
        const newStatus = ch.status === "Connected" ? "Disconnected" : "Connected";

        // Log action
        const newLog: SyncLog = {
          id: Date.now().toString(),
          time: new Date().toLocaleTimeString(),
          channel: ch.name,
          message: newStatus === "Connected" ? `Channel connected successfully.` : `Channel disconnected.`,
          type: newStatus === "Connected" ? "success" : "warning",
        };
        setLogs(prev => [newLog, ...prev].slice(0, 50)); // Keep last 50 logs

        return { ...ch, status: newStatus, lastSynced: newStatus === "Connected" ? new Date().toLocaleString() : "-" };
      }
      return ch;
    }));
  };

  const handleManualSync = async (id: string, name: string) => {
    setIsSyncing(id);

    // Simulate API call to webhook/sync endpoint
    setTimeout(() => {
      setChannels(channels.map(ch =>
        ch.id === id ? { ...ch, lastSynced: new Date().toLocaleString() } : ch
      ));

      const newLog: SyncLog = {
        id: Date.now().toString(),
        time: new Date().toLocaleTimeString(),
        channel: name,
        message: "Manual sync triggered. Availability updated.",
        type: "success",
      };
      setLogs(prev => [newLog, ...prev].slice(0, 50));

      setIsSyncing(null);
    }, 1500);
  };

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case "success": return "text-green-500";
      case "warning": return "text-amber-500";
      case "error": return "text-red-500";
      case "info": return "text-blue-500";
      default: return "text-gray-500";
    }
  };

  return (
    <>
      <PageBreadcrumb pageTitle="Channel Manager (OTA Sync)" />

      <div className="flex flex-col gap-6 relative">
        <div className="flex justify-between items-center bg-white p-5 rounded-sm border border-stroke shadow-default dark:border-strokedark dark:bg-boxdark">
          <div>
            <h2 className="text-title-md2 font-semibold text-black dark:text-white">OTA Integrations</h2>
            <p className="text-sm text-gray-500 mt-1">Kelola koneksi sinkronisasi kamar dengan berbagai platform OTA.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* KIRI: DAFTAR OTA */}
          <div className="xl:col-span-2 flex flex-col gap-4">
            {channels.map((channel) => (
              <div key={channel.id} className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{channel.logo}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-black dark:text-white">{channel.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${channel.status === 'Connected' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {channel.status}
                      </span>
                      <span className="text-xs text-gray-500">Last Synced: {channel.lastSynced}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {channel.status === "Connected" && (
                    <button
                      onClick={() => handleManualSync(channel.id, channel.name)}
                      disabled={isSyncing === channel.id}
                      className="flex items-center justify-center gap-2 rounded bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-opacity-90 disabled:bg-gray-400 transition-all"
                    >
                      {isSyncing === channel.id ? "Syncing..." : "Sync Now"}
                    </button>
                  )}

                  <button
                    onClick={() => handleConnectToggle(channel.id)}
                    className={`flex items-center justify-center gap-2 rounded border py-2 px-4 text-sm font-medium transition-all ${channel.status === "Connected"
                        ? "border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                        : "border-primary text-primary hover:bg-primary/10"
                      }`}
                  >
                    {channel.status === "Connected" ? "Disconnect" : "Connect"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* KANAN: SYNC LOGS */}
          <div className="xl:col-span-1 rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
            <h3 className="text-title-sm font-semibold text-black dark:text-white mb-4">Sync History</h3>

            <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto no-scrollbar pb-4">
              {logs.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Belum ada aktivitas sinkronisasi.</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="border-b border-stroke pb-3 last:border-0 dark:border-strokedark">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-semibold text-black dark:text-white">{log.channel}</span>
                      <span className="text-[10px] text-gray-400">{log.time}</span>
                    </div>
                    <p className={`text-xs ${getLogTypeColor(log.type)}`}>{log.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
