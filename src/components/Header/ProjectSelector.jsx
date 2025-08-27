// components/Header/ProjectSelector.jsx
import React, { useState } from 'react';
import { GitBranch, ChevronDown, BarChart3, Trash2 } from 'lucide-react';
import { ALL_PROJECTS_ID } from '../../constants/dimensions';
import { generateProjectColor } from '../../utils/projectUtils';

export function ProjectSelector({ 
  projects, 
  activeProjectId, 
  onSelectProject, 
  onDeleteProject 
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  
  const activeProject = activeProjectId === ALL_PROJECTS_ID 
    ? null 
    : projects.find(p => p.id === activeProjectId);
  
  const displayName = activeProjectId === ALL_PROJECTS_ID 
    ? 'Svi projekti' 
    : (activeProject?.name || 'Odaberi projekt');

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
      >
        <GitBranch className="w-4 h-4" />
        <span className="text-sm font-medium">{displayName}</span>
        {activeProjectId !== ALL_PROJECTS_ID && activeProject && (
          <div 
            className="w-3 h-3 rounded-full ml-2" 
            style={{ backgroundColor: generateProjectColor(activeProject.name) }}
          />
        )}
        <ChevronDown className="w-4 h-4" />
      </button>
      
      {showDropdown && (
        <div className="absolute top-full mt-2 left-0 w-64 bg-white rounded-xl shadow-2xl border z-50">
          <div className="p-2">
            <div className="text-xs font-semibold text-slate-500 px-2 py-1">Pregled</div>

            <div
              className={`flex items-center px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer ${
                activeProjectId === ALL_PROJECTS_ID ? 'bg-blue-50' : ''
              }`}
              onClick={() => {
                onSelectProject(ALL_PROJECTS_ID);
                setShowDropdown(false);
              }}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">Svi projekti</span>
              <span className="text-xs text-slate-400 ml-auto">
                ({projects.reduce((sum, p) => sum + (p.tasks?.length || 0), 0)} zadataka)
              </span>
            </div>

            <div className="text-xs font-semibold text-slate-500 px-2 py-1 mt-2">
              Pojedinačni Projekti
            </div>
            {projects.map(project => (
              <div
                key={project.id}
                className={`flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer ${
                  project.id === activeProjectId ? 'bg-blue-50' : ''
                }`}
                onClick={() => {
                  onSelectProject(project.id);
                  setShowDropdown(false);
                }}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: generateProjectColor(project.name) }}
                  />
                  <span className="text-sm">{project.name}</span>
                  <span className="text-xs text-slate-400">
                    ({project.tasks?.length || 0} zadataka)
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Izbrisati projekt "${project.name}"?`)) {
                      onDeleteProject(project.id);
                    }
                  }}
                  className="p-1 hover:bg-red-100 rounded"
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}