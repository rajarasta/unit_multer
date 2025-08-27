// components/Timeline/TaskBar.jsx
import React, { useMemo } from 'react';
import { 
  AlertTriangle, MessageSquare, Paperclip, 
  ScrollText, ListTodo, CheckCircle 
} from 'lucide-react';
import { STATUSI, URGENCY_LEVELS } from '../../constants/statuses';
import { PROCESI } from '../../constants/processes';
import { daysBetween } from '../../utils/dateUtils';
import { generateProjectColor } from '../../utils/projectUtils';

export const TaskBar = React.memo(function TaskBarInner({ 
  task, 
  rowIndex, 
  timeline,
  dayWidth,
  settings,
  currentViewData,
  selectedTask,
  hoveredTask,
  dragState,
  indicatorFilters,
  visibleDayStart,
  visibleDayEnd,
  visibleRowStart,
  visibleRowEnd,
  onTaskHover,
  onTaskLeave,
  onTaskMouseDown,
  onTaskClick,
  onIndicatorClick
}) {
  const missing = !task.start || !task.end;
  const status = STATUSI[task.status] || STATUSI['čeka'];
  const urgency = URGENCY_LEVELS[task.urgency || 'normal'];
  const proces = PROCESI.find(p => p.id === task.proces);
  const isSelected = selectedTask?.id === task.id;
  const isHovered = hoveredTask?.id === task.id;
  const isDragging = dragState?.id === task.id;
  
  const startDays = task.start ? daysBetween(timeline.start, new Date(task.start)) : 0;
  const endDays = task.end ? daysBetween(timeline.start, new Date(task.end)) : 1;
  const x = startDays * dayWidth;
  const width = Math.max((endDays - startDays) * dayWidth, 20);
  const y = rowIndex * 36 + 4;
  const height = 36 - 8;
  
  const hasComments = task.komentari?.length > 0;
  const hasDocs = task.prilozi?.length > 0;
  const hasDescription = task.opis && task.opis.length > 0;
  const hasSubtasks = (currentViewData.subtasksByPosition?.[task.pozicija]?.length || 0) > 0;
  
  const projectColor = generateProjectColor(task.projectName || '');
  const useProjectColors = settings.useProjectColors;

  if (missing) {
    if (rowIndex < visibleRowStart || rowIndex > visibleRowEnd) return null;
    return (
      <div key={task.id} className="absolute" style={{ 
        left: 10, 
        top: `${rowIndex * 36 + 4}px`, 
        width: 220, 
        height 
      }}>
        <div className="h-full bg-red-500 rounded-lg border-2 border-red-600 flex items-center px-2 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-white mr-2" />
          <span className="text-xs font-bold text-white">NEMA DATUM!</span>
        </div>
      </div>
    );
  }
  
  const startDayIdx = Math.floor(x / dayWidth);
  const endDayIdx = Math.ceil((x + width) / dayWidth);
  if (rowIndex < visibleRowStart || rowIndex > visibleRowEnd) return null;
  if (endDayIdx < visibleDayStart || startDayIdx > visibleDayEnd) return null;
  
  const onClickBar = () => {
    if (settings.openEditorOnTrayClick) {
      onTaskClick(task, 'edit');
    } else {
      onTaskClick(task, 'select');
    }
  };
  
  const glowClass = settings.showUrgencyGlow && task.urgency ? 
    task.urgency === 'critical' ? 'glow-critical' :
    task.urgency === 'high' ? 'glow-high' :
    task.urgency === 'medium' ? 'glow-medium' : ''
    : '';
  
  return (
    <>
      {settings.showProgressPercentage && (
        <div 
          className="absolute select-none" 
          style={{ 
            left: Math.max(0, x - 22), 
            top: y, 
            width: 20, 
            height, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'flex-end', 
            opacity: 0.35, 
            fontSize: 10, 
            color: '#475569' 
          }}
        >
          {task.progress ?? 0}%
        </div>
      )}
      <div 
        className={`absolute ${settings.enableAnimations ? 'transition-all duration-150' : ''} ${
          isSelected ? 'z-20' : isHovered ? 'z-15' : 'z-10'
        } ${isDragging ? 'cursor-grabbing opacity-75' : 'cursor-pointer'} ${glowClass}`} 
        style={{
          left: x,
          top: y,
          width,
          height,
          transform: isHovered && !isDragging && settings.enableAnimations ? 'scale(1.02)' : 'scale(1)',
          contentVisibility: 'auto',
          contain: 'layout paint size'
        }} 
        onMouseEnter={(e) => !isDragging && onTaskHover(task, e.currentTarget)} 
        onMouseLeave={() => !isDragging && onTaskLeave()} 
        onClick={onClickBar} 
        onMouseDown={(e) => onTaskMouseDown(e, task, 'move')}
      >
        <div 
          className={`h-full rounded-lg border-2 overflow-hidden ${
            isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''
          } ${
            settings.highlightOverdue && task.status === 'kasni' ? 'animate-pulse' : ''
          } ${
            task.proces === 'općenito' && !useProjectColors ? 'rainbow-gradient' : ''
          }`} 
          style={{
            backgroundColor: useProjectColors ? `${projectColor}20` : status.light,
            borderColor: useProjectColors ? projectColor : 
                       (task.urgency === 'critical' || task.urgency === 'high' ? urgency.bg : status.border),
            background: task.proces === 'općenito' && !useProjectColors ? 
                       'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #fda085 100%)' :
                       (useProjectColors ? `${projectColor}20` : status.light)
          }}
        >
          <div 
            className="absolute left-0 top-0 bottom-0 opacity-30 pointer-events-none" 
            style={{ 
              width: `${task.progress || 0}%`, 
              backgroundColor: useProjectColors ? projectColor : status.bg
            }} 
          />
          <div className="relative h-full flex items-center px-2">
            {settings.showIconsInBar && proces && (
              <proces.ikona className="w-3 h-3 mr-1.5 flex-shrink-0" 
                style={{ 
                  color: useProjectColors ? projectColor : 
                        (typeof proces.boja === 'string' && proces.boja.includes('gradient') ? '#764ba2' : proces.boja) 
                }} 
              />
            )}
            <span 
              className={`inline-block w-1.5 h-1.5 mr-1 rounded-full ${
                task.status === 'kasni' ? 'pulse-strong' : ''
              }`} 
              style={{ backgroundColor: status.bg }} 
            />
            <span className={`text-xs font-medium truncate ${
              task.proces === 'općenito' && !useProjectColors ? 'text-white' : 'text-slate-700'
            }`}>
              {task.naziv}{settings.showPositionInBar ? ` - ${task.pozicija.slice(0, 18)}` : ''}
            </span>
          </div>
          <div 
            className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-blue-500/30" 
            onMouseDown={(e) => {
              e.stopPropagation();
              onTaskMouseDown(e, task, 'resize-left');
            }} 
          />
          <div 
            className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-blue-500/30" 
            onMouseDown={(e) => {
              e.stopPropagation();
              onTaskMouseDown(e, task, 'resize-right');
            }} 
          />
        </div>
      </div>
      
      {settings.showStatusIndicators && (
        <div 
          className="absolute" 
          style={{ 
            left: x + width + 6, 
            top: y, 
            height, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6 
          }}
        >
          <MessageSquare 
            className={`w-3 h-3 cursor-pointer transition-all ${
              indicatorFilters.has('comments') ? 'scale-125' : ''
            }`} 
            style={{
              opacity: hasComments ? 0.9 : 0.3, 
              color: hasComments ? '#2563eb' : '#94a3b8', 
              filter: indicatorFilters.has('comments') ? 'drop-shadow(0 0 8px #2563eb)' : 'none'
            }} 
            title={hasComments ? 'Ima komentara' : 'Bez komentara'} 
            onClick={(e) => { 
              e.stopPropagation(); 
              onIndicatorClick('comments'); 
            }} 
          />
          <Paperclip 
            className={`w-3 h-3 cursor-pointer transition-all ${
              indicatorFilters.has('docs') ? 'scale-125' : ''
            }`} 
            style={{
              opacity: hasDocs ? 0.9 : 0.3, 
              color: hasDocs ? '#16a34a' : '#94a3b8', 
              filter: indicatorFilters.has('docs') ? 'drop-shadow(0 0 8px #16a34a)' : 'none'
            }} 
            title={hasDocs ? 'Ima priloga' : 'Bez priloga'} 
            onClick={(e) => { 
              e.stopPropagation(); 
              onIndicatorClick('docs'); 
            }} 
          />
          <ScrollText 
            className={`w-3 h-3 cursor-pointer transition-all ${
              indicatorFilters.has('description') ? 'scale-125' : ''
            }`} 
            style={{
              opacity: hasDescription ? 0.9 : 0.3, 
              color: hasDescription ? '#7c3aed' : '#94a3b8', 
              filter: indicatorFilters.has('description') ? 'drop-shadow(0 0 8px #7c3aed)' : 'none'
            }} 
            title={hasDescription ? 'Ima opis' : 'Bez opisa'} 
            onClick={(e) => { 
              e.stopPropagation(); 
              onIndicatorClick('description'); 
            }} 
          />
          <ListTodo 
            className={`w-3 h-3 cursor-pointer transition-all ${
              indicatorFilters.has('subtasks') ? 'scale-125' : ''
            }`} 
            style={{
              opacity: hasSubtasks ? 0.9 : 0.3, 
              color: hasSubtasks ? '#f59e0b' : '#94a3b8', 
              filter: indicatorFilters.has('subtasks') ? 'drop-shadow(0 0 8px #f59e0b)' : 'none'
            }} 
            title={hasSubtasks ? `${currentViewData.subtasksByPosition[task.pozicija].length} podzadataka` : 'Bez podzadataka'} 
            onClick={(e) => { 
              e.stopPropagation(); 
              if (hasSubtasks) {
                onIndicatorClick('subtasks', task.pozicija);
              } else {
                onIndicatorClick('subtasks');
              }
            }} 
          />
        </div>
      )}
    </>
  );
});