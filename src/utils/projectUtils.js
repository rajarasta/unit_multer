// utils/projectUtils.js
export const generateProjectColor = (projectName) => {
  let hash = 0;
  for (let i = 0; i < projectName.length; i++) {
    hash = projectName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
};

export const generateEmptyProject = (name = 'Prazan Projekt') => {
  return {
    id: `proj-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    name,
    tasks: [],
    pozicije: [],
    events: [],
    history: [],
    subtasksByPosition: {},
    documents: []
  };
};