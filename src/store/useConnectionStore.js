import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Predefined color palette for connection groups
const CONNECTION_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6'  // teal
];

const useConnectionStore = create(
  persist(
    (set, get) => ({
      // Connection groups: { groupId: { units: [1,2,3], color: '#color', timestamp: Date, type: 'manual'|'auto' } }
      connectionGroups: {},

      // Individual unit connections for quick lookup: { unitId: groupId }
      unitToGroup: {},

      // Available colors (cycling through palette)
      availableColors: [...CONNECTION_COLORS],
      usedColors: [],

      // Get next available color
      getNextColor: () => {
        const { availableColors, usedColors } = get();
        if (availableColors.length === 0) {
          // Reset color palette when exhausted
          set({
            availableColors: [...CONNECTION_COLORS],
            usedColors: []
          });
          return CONNECTION_COLORS[0];
        }
        return availableColors[0];
      },

      // Create new connection group
      createConnectionGroup: (unitIds, type = 'manual') => {
        const { getNextColor, availableColors, usedColors, connectionGroups, unitToGroup } = get();

        // Validate input
        if (!Array.isArray(unitIds) || unitIds.length < 2 || unitIds.length > 4) {
          console.error('Connection group must have 2-4 units');
          return null;
        }

        // Check if any unit is already connected
        const alreadyConnected = unitIds.some(unitId => unitToGroup[unitId]);
        if (alreadyConnected) {
          console.error('One or more units are already connected');
          return null;
        }

        const color = getNextColor();
        const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const newGroup = {
          units: [...unitIds].sort((a, b) => a - b), // Sort for consistency
          color,
          timestamp: Date.now(),
          type,
          createdAt: new Date().toISOString()
        };

        // Update state
        const newConnectionGroups = {
          ...connectionGroups,
          [groupId]: newGroup
        };

        const newUnitToGroup = { ...unitToGroup };
        unitIds.forEach(unitId => {
          newUnitToGroup[unitId] = groupId;
        });

        const newAvailableColors = availableColors.filter(c => c !== color);
        const newUsedColors = [...usedColors, color];

        set({
          connectionGroups: newConnectionGroups,
          unitToGroup: newUnitToGroup,
          availableColors: newAvailableColors,
          usedColors: newUsedColors
        });

        // Dispatch global event for UI updates
        window.dispatchEvent(new CustomEvent('connection-group-created', {
          detail: { groupId, group: newGroup }
        }));

        return groupId;
      },

      // Add unit to existing group (if space available)
      addUnitToGroup: (unitId, groupId) => {
        const { connectionGroups, unitToGroup } = get();

        if (unitToGroup[unitId]) {
          console.error('Unit is already connected');
          return false;
        }

        const group = connectionGroups[groupId];
        if (!group) {
          console.error('Group does not exist');
          return false;
        }

        if (group.units.length >= 4) {
          console.error('Group is full (max 4 units)');
          return false;
        }

        const updatedGroup = {
          ...group,
          units: [...group.units, unitId].sort((a, b) => a - b),
          timestamp: Date.now()
        };

        set({
          connectionGroups: {
            ...connectionGroups,
            [groupId]: updatedGroup
          },
          unitToGroup: {
            ...unitToGroup,
            [unitId]: groupId
          }
        });

        window.dispatchEvent(new CustomEvent('connection-group-updated', {
          detail: { groupId, group: updatedGroup }
        }));

        return true;
      },

      // Remove unit from group
      removeUnitFromGroup: (unitId) => {
        const { connectionGroups, unitToGroup, usedColors, availableColors } = get();

        const groupId = unitToGroup[unitId];
        if (!groupId) {
          console.error('Unit is not connected');
          return false;
        }

        const group = connectionGroups[groupId];
        const updatedUnits = group.units.filter(id => id !== unitId);

        // If only one unit left, dissolve the group
        if (updatedUnits.length <= 1) {
          return get().dissolveGroup(groupId);
        }

        // Update group
        const updatedGroup = {
          ...group,
          units: updatedUnits,
          timestamp: Date.now()
        };

        const newUnitToGroup = { ...unitToGroup };
        delete newUnitToGroup[unitId];

        set({
          connectionGroups: {
            ...connectionGroups,
            [groupId]: updatedGroup
          },
          unitToGroup: newUnitToGroup
        });

        window.dispatchEvent(new CustomEvent('connection-group-updated', {
          detail: { groupId, group: updatedGroup }
        }));

        return true;
      },

      // Dissolve entire group
      dissolveGroup: (groupId) => {
        const { connectionGroups, unitToGroup, usedColors, availableColors } = get();

        const group = connectionGroups[groupId];
        if (!group) {
          console.error('Group does not exist');
          return false;
        }

        // Remove all units from unitToGroup mapping
        const newUnitToGroup = { ...unitToGroup };
        group.units.forEach(unitId => {
          delete newUnitToGroup[unitId];
        });

        // Remove group
        const newConnectionGroups = { ...connectionGroups };
        delete newConnectionGroups[groupId];

        // Return color to available pool
        const newUsedColors = usedColors.filter(c => c !== group.color);
        const newAvailableColors = [...availableColors, group.color];

        set({
          connectionGroups: newConnectionGroups,
          unitToGroup: newUnitToGroup,
          usedColors: newUsedColors,
          availableColors: newAvailableColors
        });

        window.dispatchEvent(new CustomEvent('connection-group-dissolved', {
          detail: { groupId, units: group.units }
        }));

        return true;
      },

      // Get connection info for a unit
      getUnitConnection: (unitId) => {
        const { unitToGroup, connectionGroups } = get();
        const groupId = unitToGroup[unitId];
        if (!groupId) return null;

        return {
          groupId,
          group: connectionGroups[groupId]
        };
      },

      // Get all connected units for a unit
      getConnectedUnits: (unitId) => {
        const connection = get().getUnitConnection(unitId);
        if (!connection) return [];

        return connection.group.units.filter(id => id !== unitId);
      },

      // Check if two units are connected
      areUnitsConnected: (unitId1, unitId2) => {
        const { unitToGroup } = get();
        return unitToGroup[unitId1] && unitToGroup[unitId1] === unitToGroup[unitId2];
      },

      // Get all groups
      getAllGroups: () => {
        return get().connectionGroups;
      },

      // Clear all connections
      clearAllConnections: () => {
        set({
          connectionGroups: {},
          unitToGroup: {},
          availableColors: [...CONNECTION_COLORS],
          usedColors: []
        });

        window.dispatchEvent(new CustomEvent('all-connections-cleared'));
      },

      // Recovery: restore connections after refresh
      recoverConnections: () => {
        const { connectionGroups } = get();

        // Dispatch recovery events for each group
        Object.entries(connectionGroups).forEach(([groupId, group]) => {
          window.dispatchEvent(new CustomEvent('connection-group-recovered', {
            detail: { groupId, group }
          }));
        });

        console.log(`Recovered ${Object.keys(connectionGroups).length} connection groups`);
      },

      // Stats
      getStats: () => {
        const { connectionGroups } = get();
        const groups = Object.values(connectionGroups);

        return {
          totalGroups: groups.length,
          totalConnectedUnits: groups.reduce((sum, group) => sum + group.units.length, 0),
          groupSizes: groups.map(group => group.units.length),
          oldestConnection: groups.length > 0 ? Math.min(...groups.map(g => g.timestamp)) : null,
          newestConnection: groups.length > 0 ? Math.max(...groups.map(g => g.timestamp)) : null
        };
      }
    }),
    {
      name: 'unit-connections-storage',
      version: 1,
      // Only persist the essential state
      partialize: (state) => ({
        connectionGroups: state.connectionGroups,
        unitToGroup: state.unitToGroup,
        usedColors: state.usedColors,
        availableColors: state.availableColors
      })
    }
  )
);

export default useConnectionStore;