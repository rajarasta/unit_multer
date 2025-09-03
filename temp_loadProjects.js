  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      
      // FORCE DEMO INTEGRATION FOR NOW - until AGBIM has full data
      console.log('🔧 FORCING demo integration with 20 positions...');
      
      // Always integrate demo data into AGBIM format for now
      const integratedData = integrateWithAgbimDatabase();
      
      // Create enhanced project with integrated data
      const enhancedProject = {
        id: 'ZErU46IjfLOOUsoxiPy1a',
        name: 'Demo Aluminum Project - Integrated',
        orderNo: 'ORD-2025-001',
        client: 'Aluminum Solutions d.o.o.',
        currency: 'EUR',
        status: 'active',
        positions: integratedData.positions,
        dispatches: integratedData.dispatches,
        warehouse: integratedData.warehouse,
        processes: integratedData.processes,
        materials: integratedData.materials
      };
      
      setProjects([enhancedProject]);
      setActiveProject(enhancedProject);
      setPositions(enhancedProject.positions);
      
      console.log(`🎯 FORCED integration: ${enhancedProject.positions.length} positions loaded`);
      console.log('📋 Positions titles:', enhancedProject.positions.map(p => p.title));
      
    } catch (error) {
      console.error('❌ Error loading projects:', error);
      
      // Fallback to demo data with integration
      console.log('🔄 Falling back to demo data...');
      const integratedData = integrateWithAgbimDatabase();
      const fallbackProject = {
        id: 'demo_fallback',
        name: 'Demo Aluminum Project - Fallback',
        positions: integratedData.positions
      };
      
      setProjects([fallbackProject]);
      setActiveProject(fallbackProject);
      setPositions(fallbackProject.positions);
      
      console.log(`🎯 Fallback loaded ${fallbackProject.positions.length} positions`);
    } finally {
      setLoading(false);
    }
  }, []);