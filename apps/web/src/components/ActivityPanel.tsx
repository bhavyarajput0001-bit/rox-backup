import { motion } from "framer-motion";
import { FileText, Clock, ArrowUpRight } from "lucide-react";
import { useRoxStore } from "@rox/ui/store";
import type { Activity } from "@rox/types";

const MOCK_ACTIVITIES: Activity[] = [
  {
    id: "1",
    type: "document",
    title: "Resume Redesign",
    description: "Created",
    timestamp: "2 hours ago",
    icon: "file",
  },
  {
    id: "2",
    type: "task",
    title: "Application Form",
    description: "Updated",
    timestamp: "4 hours ago",
    icon: "check",
  },
  {
    id: "3",
    type: "research",
    title: "Hindi Question Paper",
    description: "Compiled",
    timestamp: "6 hours ago",
    icon: "search",
  },
  {
    id: "4",
    type: "analysis",
    title: "Research & Insights",
    description: "Explored",
    timestamp: "8 hours ago",
    icon: "chart",
  },
];

export default function ActivityPanel() {
  const activities =
    useRoxStore((s) =>
      s.tasks.map((t) => ({
        id: t.id,
        type: "task",
        title: t.title,
        description: `${t.status.replace("_", " ")}`,
        timestamp: "just now",
        icon: "check",
      })),
    ).length > 0
      ? useRoxStore((s) =>
          s.tasks.map((t) => ({
            id: t.id,
            type: "task",
            title: t.title,
            description: `${t.status.replace("_", " ")}`,
            timestamp: "just now",
            icon: "check",
          })),
        )
      : MOCK_ACTIVITIES;

  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="glass-panel rounded-[var(--radius-lg)] p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-rox-text text-sm font-medium tracking-wide">
          Recent Activity
        </h3>
        <button className="text-rox-amber text-xs hover:text-rox-gold transition-colors flex items-center gap-1">
          View All <ArrowUpRight size={12} />
        </button>
      </div>

      <div className="space-y-3">
        {activities.map((activity, i) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-start gap-3 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-rox-amber/10 border border-rox-amber/20 flex items-center justify-center flex-shrink-0 group-hover:border-rox-amber/40 transition-colors">
              <FileText size={14} className="text-rox-amber" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-rox-text text-xs font-medium truncate">
                {activity.title}
              </p>
              <p className="text-rox-gray text-[11px]">
                {activity.description}
              </p>
            </div>
            <div className="flex items-center gap-1 text-rox-dim text-[10px]">
              <Clock size={10} />
              <span>{activity.timestamp}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
