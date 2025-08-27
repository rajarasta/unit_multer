// utils/taskUtils.js
import { STATUSI, URGENCY_LEVELS } from '../constants/statuses';
import { GANTT_STATUS_COLORS } from '../constants/colors';

export const getGanttStatusColor = (status) =>
  GANTT_STATUS_COLORS[status] || "#5c5c5c";

export const getMarkerVisualStatus = (taskData, settings) => {
  if (!taskData) return { color: "#a8a8a8", name: "Unassigned" };
  const installation = taskData.floorManagement?.installation;

  if (installation?.reklamacija)
    return { color: "#dc2626", name: "Reklamacija" };

  if (settings.prioritizeInstallationStatus) {
    if (installation?.zavrseno)
      return { color: "#0e7a0d", name: "Instalacija završena" };
    if (
      installation?.spremno ||
      installation?.montirano ||
      installation?.ostakljeno ||
      installation?.brtvljenje ||
      installation?.dodaci
    )
      return { color: "#10b981", name: "Montaža u tijeku" };
  }
  return { color: getGanttStatusColor(taskData.status), name: taskData.status };
};

export const initializeTask = (task) => ({
  ...task,
  id: task.id || `task-${Math.random().toString(36).slice(2)}`,
  name: task.name || "Pozicija",
  department: task.department || "N/A",
  status: task.status || "Planning",
  floorManagement: task.floorManagement || {
    location: null,
    installation: {
      spremno: false,
      montirano: false,
      ostakljeno: false,
      brtvljenje: false,
      dodaci: false,
      zavrseno: false,
      reklamacija: "",
    },
  },
  details: task.details || {
    description: task.description || "",
    documents: task.documents || [],
    comments: task.comments || [],
  },
});